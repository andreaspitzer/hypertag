// Opt-in cleanup layer for the raw strings the core parser returns. hypertag hands back
// attribute values exactly as written, so HTML entities are undecoded (`Rock &amp; Roll`)
// and whitespace is untouched. This layer decodes and tidies them, so extracted metadata
// reads like text instead of markup:
//
//   sanitize(parse(html, 'meta'))      // decode + collapse whitespace on every attribute
//   decode('caf&eacute; &#151; done')  // -> 'café — done'
//   cleanUrl('/p?utm_source=x', base)  // resolve + strip tracking params
//
// The built-in decoder is deliberately TINY and fast: it covers what real metadata uses -
// numeric references, the Windows-1252 remap those old CMSes emit, and a common named set -
// at a fraction of the size of a full HTML5 entity table. When a page needs the full ~2,000
// named entities or semicolon-less legacy refs, pass your own decoder (the proven `entities`
// or `he`) via the `decode` option; you pay for it only when you need it. Zero dependencies.

// Numeric references in 0x80-0x9F are not the raw code points: HTML remaps them to these
// Windows-1252 characters (what `&#146;`, `&#151;`, `&#133;` etc. mean on real pages).
const WINDOWS_1252 = {
  128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ',
  137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž', 145: '‘', 146: '’', 147: '“',
  148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›',
  156: 'œ', 158: 'ž', 159: 'Ÿ'
}

// Common named references that turn up in titles, descriptions and URLs. The long tail of
// HTML5 named entities is intentionally left to an injected decoder.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', shy: '­',
  hellip: '…', mdash: '—', ndash: '–', minus: '−',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„',
  laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™',
  deg: '°', plusmn: '±', times: '×', divide: '÷',
  frac12: '½', frac14: '¼', frac34: '¾',
  euro: '€', pound: '£', yen: '¥', cent: '¢',
  sect: '§', para: '¶', middot: '·', bull: '•',
  dagger: '†', Dagger: '‡', prime: '′', Prime: '″'
}

const entityPattern = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi
const whitespacePattern = /\s+/g

module.exports = sanitize
Object.assign(module.exports, {
  sanitize,
  decode,
  cleanUrl
})

// Clean a value: strings are decoded, whitespace-collapsed and trimmed; a Tag (or array of
// Tags) is returned with each string value cleaned; anything else (boolean, number, null)
// passes through. Recursive, so `parse()` output can be handed in directly. Pass
// `{decode: fn}` to swap the built-in decoder for a full one, e.g. `entities.decodeHTML`.
function sanitize(value, options) {
  return clean(value, options?.decode ?? decode)
}

function clean(value, decoder) {
  if (typeof value === 'string') {
    return decoder(value).replace(whitespacePattern, ' ').trim()
  }
  if (Array.isArray(value)) {
    return value.map(item => clean(item, decoder))
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) {
      out[key] = clean(value[key], decoder)
    }
    return out
  }
  return value
}

// Decode HTML character references. Non-strings and strings without `&` return unchanged (a
// cheap fast path). Numeric references (decimal and hex) are always decoded, with the
// Windows-1252 remap for 0x80-0x9F; unknown named references are left verbatim.
function decode(text) {
  if (typeof text !== 'string' || text.indexOf('&') === -1) {
    return text
  }
  return text.replace(entityPattern, (match, body) => {
    if (body.charCodeAt(0) === 0x23) {
      // '#': numeric reference. (charCode | 0x20) === 0x78 tests for 'x'/'X'.
      const code =
        (body.charCodeAt(1) | 0x20) === 0x78
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10)
      if (Object.hasOwn(WINDOWS_1252, code)) return WINDOWS_1252[code]
      return fromCodePoint(code) ?? match
    }
    return Object.hasOwn(NAMED, body) ? NAMED[body] : match
  })
}

function fromCodePoint(code) {
  // The regex only yields a finite, non-negative integer, so reject just the values
  // String.fromCodePoint would choke on: past the Unicode max, or a lone surrogate.
  if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return null
  }
  return String.fromCodePoint(code)
}

// Resolve `url` (against `base` if relative) and strip what metascraper strips with
// normalize-url's defaults but native URL cannot: credentials, `utm_*` tracking params, and
// text-fragment directives. Returns the input unchanged if it is not a parseable URL.
function cleanUrl(url, base) {
  if (typeof url !== 'string') {
    return url
  }
  let parsed
  try {
    parsed = base == null ? new URL(url) : new URL(url, base)
  } catch {
    return url
  }
  parsed.username = ''
  parsed.password = ''
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^utm_/i.test(key)) {
      parsed.searchParams.delete(key)
    }
  }
  if (parsed.hash) {
    parsed.hash = parsed.hash.replace(/:~:.*$/, '').replace(/^#/, '')
  }
  return parsed.href
}
