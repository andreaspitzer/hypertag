// Opt-in metadata layer - the top of the stack, built on select + ld + sanitize. It turns a
// declarative rules table into a flat metadata object. Two honest halves:
//
//   - the ENGINE (extract, the source helpers, the normalizers) is domain-agnostic: hand it
//     any rules and it knows nothing about "og" or "title";
//   - the default `rules` table is the only opinion (og beats twitter beats title-text, with
//     property-or-name leniency), and it is overridable - pass your own to `extract`.
//
// A field's sources are tried in preference (list) order; the first with a usable value wins,
// and the field's normalizer (`text` / `url` / `raw`) cleans it. Zero runtime dependencies.
const select = require('./select.js')
const ldLayer = require('./ld.js')
const {sanitize, decode, cleanUrl} = require('./sanitize.js')

// ---- source helpers: declarative markers a rule lists in preference order ------------------
// All variadic; the arguments are preference order (first key that yields a value wins).

// A meta value under EITHER `property` or `name` (they are used interchangeably in the wild -
// MDN writes its OpenGraph tags as `name=`), matched case-insensitively, read from `content`.
const meta = (...keys) => ({html: keys.map(key => [`meta[property=${key}], meta[name=${key}]`, 'content'])})
// A link's `href` by `rel` word (so `stylesheet` matches `rel="stylesheet"`, `icon` matches
// `rel="shortcut icon"`).
const link = (...rels) => ({html: rels.map(rel => [`link[rel~=${rel}]`, 'href'])})
// An element's text content (the core `content` option), e.g. `content('title')`.
const content = (...tags) => ({html: tags.map(tag => [tag, '$content'])})
// A JSON-LD value for any of `keys`, from the flattened graph.
const ld = (...keys) => ({ld: keys})
// JSON-LD value, coerced from a person/organization shape down to a name.
const ldName = (...keys) => ({ld: keys, coerce: ldLayer.asName})
// JSON-LD value, coerced from an image/URL shape down to a URL.
const ldUrl = (...keys) => ({ld: keys, coerce: ldLayer.asUrl})

// ---- normalizers: how each field type is cleaned once a source wins -----------------------
const normalizers = {
  text: value => sanitize(value), // entity-decode + collapse whitespace
  url: (value, base) => cleanUrl(decode(value), base), // decode, resolve against base, strip tracking
  raw: value => value // leave as-is (dates, ids)
}

// ---- engine -------------------------------------------------------------------------------
function extract(source, url, ruleset) {
  return extract.compile(ruleset)(source, url)
}

// Compile a rules table once into a reusable extractor, mirroring select.compile. Every
// HTML source's selectors are baked here, so a reused table compiles them a single time.
extract.compile = ruleset => {
  const fields = Object.entries(ruleset).map(([field, spec]) => {
    const [type, sources] = Object.entries(spec)[0]
    const compiled = sources.map(src =>
      src.html ? {resolve: select.pick.compile(src.html)} : {ldKeys: src.ld, coerce: src.coerce}
    )
    return {field, normalize: normalizers[type], sources: compiled}
  })
  return (source, url) => {
    // One parse memo per page, local to this call - so the repeated parse(source, 'meta') /
    // parse(source, 'link') scans across the fields collapse to one each. Being a local Map
    // threaded down (not shared state), concurrent extractions never mix caches.
    const cache = new Map()
    let graph // built lazily, only if a JSON-LD source is actually reached
    const out = {}
    for (const {field, normalize, sources} of fields) {
      let value
      for (const src of sources) {
        if (src.resolve) {
          value = src.resolve(source, cache)
        } else {
          graph ??= ldLayer(source, cache)
          value = ldLayer.pick(graph, ...src.ldKeys)
          if (src.coerce) value = src.coerce(value)
        }
        if (value != null && value !== '') break
        value = undefined
      }
      out[field] = value == null ? null : normalize(value, url)
    }
    return out
  }
}

// ---- the default rules (the opinion - overridable) ----------------------------------------
const rules = {
  title: {text: [meta('og:title', 'twitter:title'), ld('headline', 'name'), content('title')]},
  description: {text: [meta('og:description', 'description', 'twitter:description'), ld('description')]},
  image: {url: [meta('og:image', 'twitter:image'), ldUrl('image', 'thumbnailUrl')]},
  url: {url: [meta('og:url'), link('canonical'), ld('url')]},
  author: {text: [meta('author', 'article:author'), ldName('author')]},
  date: {raw: [meta('article:published_time', 'date'), ld('datePublished', 'dateModified', 'uploadDate')]},
  publisher: {text: [meta('og:site_name'), ldName('publisher')]}
}

// ---- batteries-included entry: metadata(source, url) uses the default rules ----------------
const runDefault = extract.compile(rules)
function metadata(source, url, ruleset) {
  return ruleset ? extract(source, url, ruleset) : runDefault(source, url)
}

module.exports = metadata
Object.assign(module.exports, {metadata, extract, rules, meta, link, content, ld, ldName, ldUrl})
