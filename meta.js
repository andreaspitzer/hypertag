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
import ldLayer from './ld.js'
import parse from './parse.js'
import select from './select.js'
import {cleanUrl, decode, sanitize} from './sanitize.js'

// ---- source helpers: declarative markers a rule lists in preference order ------------------
// All variadic; the arguments are preference order (first key that yields a value wins).

// A meta value under EITHER `property` or `name` (used interchangeably in the wild - MDN writes
// its OpenGraph tags as `name=`), case-insensitive, read from `content`. Resolved through a
// precomputed property/name -> content index (see the engine), so many meta fields cost one
// pass over the parsed <meta> tags rather than a filtered scan each.
const meta = (...keys) => ({meta: keys})
// A link's `href` by `rel` word (`stylesheet` matches `rel="stylesheet"`, `icon` matches
// `rel="shortcut icon"`), resolved through a precomputed rel-word -> href index.
const link = (...rels) => ({link: rels})
// An element's text content (the core `content` option), e.g. `content('title')`.
const content = (...tags) => ({html: tags.map(tag => [tag, '$content'])})
// Any attribute of a matched tag, e.g. `attr('html', 'lang')` reads `<html lang>`.
const attr = (selector, attribute) => ({html: [[selector, attribute]]})
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

// ---- fast attribute reads and per-page indexes --------------------------------------------
// Case-insensitive attribute read: HTML attribute names are case-insensitive and the parser
// keeps the source's case. Fast path (exact key) first, then a one-time scan.
function attrOf(tag, name) {
  if (Object.hasOwn(tag, name)) return tag[name]
  for (const key of Object.keys(tag)) {
    if (key.toLowerCase() === name) return tag[key]
  }
  return undefined
}

// property/name -> content over the <meta> tags, first occurrence (document order) winning.
// Built once per page, so every meta field becomes an O(1) lookup instead of a filtered scan.
function metaIndexOf(source, cache) {
  const index = new Map()
  for (const tag of parse(source, 'meta', undefined, cache)) {
    const value = attrOf(tag, 'content')
    for (const key of [attrOf(tag, 'property'), attrOf(tag, 'name')]) {
      if (typeof key === 'string') {
        const lowered = key.toLowerCase()
        if (!index.has(lowered)) index.set(lowered, value)
      }
    }
  }
  return index
}

// rel word -> href over the <link> tags (mirrors `link[rel~=word]`), first occurrence winning.
function linkIndexOf(source, cache) {
  const index = new Map()
  for (const tag of parse(source, 'link', undefined, cache)) {
    const rel = attrOf(tag, 'rel')
    if (typeof rel !== 'string') continue
    const href = attrOf(tag, 'href')
    for (const word of rel.toLowerCase().split(/\s+/)) {
      if (word && !index.has(word)) index.set(word, href)
    }
  }
  return index
}

// First key with a usable (present, non-empty) value, in preference order.
function pickIndex(index, keys) {
  for (const key of keys) {
    const value = index.get(key)
    if (value != null && value !== '') return value
  }
  return undefined
}

// ---- engine -------------------------------------------------------------------------------
function extract(source, url, ruleset) {
  return extract.compile(ruleset)(source, url)
}

// Compile a rules table once into a reusable extractor, mirroring select.compile. Each source
// becomes one of four kinds: a meta or link index lookup (the common case, now O(1) per field),
// a generic select.pick (content/attr - kept fully general), or a JSON-LD lookup.
extract.compile = ruleset => {
  const fields = Object.entries(ruleset).map(([field, spec]) => {
    const [type, sources] = Object.entries(spec)[0]
    const compiled = sources.map(src => {
      if (src.meta) return {meta: src.meta.map(key => key.toLowerCase())}
      if (src.link) return {link: src.link.map(rel => rel.toLowerCase())}
      if (src.html) return {resolve: select.pick.compile(src.html)}
      return {ldKeys: src.ld, coerce: src.coerce}
    })
    return {field, normalize: normalizers[type], sources: compiled}
  })
  return (source, url, cache) => {
    // One parse memo (created here, or supplied by metadata() so its favicon and oembed scans
    // share it), plus a meta/link index and a JSON-LD graph, all built lazily and at most once
    // per page. Being local to the operation (not shared globally), concurrent extractions never
    // mix state.
    cache ??= new Map()
    let metaIndex
    let linkIndex
    let graph
    const out = {}
    for (const {field, normalize, sources} of fields) {
      let value
      for (const src of sources) {
        if (src.meta) {
          metaIndex ??= metaIndexOf(source, cache)
          value = pickIndex(metaIndex, src.meta)
        } else if (src.link) {
          linkIndex ??= linkIndexOf(source, cache)
          value = pickIndex(linkIndex, src.link)
        } else if (src.resolve) {
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

// ---- favicon extraction (domain logic the declarative engine can't express) ---------------
// Picking the "best" icon needs size ranking and a /favicon.ico fallback, neither of which a
// rules source can do, so favicons live as their own functions and metadata() calls them.
const iconLinks = select.compile('link[rel*=icon]')

// `cache`, when metadata() threads one in, is the same per-page parse memo the engine uses, so
// the favicon's link scan reuses the one already done for the card (no extra pass).

// Rank an icon: SVG or sizes="any" first (scales to anything), then the largest declared raster
// size, then apple-touch-icon (conventionally 180px), then 0. Ties keep document order (stable sort).
function iconScore(icon) {
  if (icon.type.includes('svg') || icon.sizes === 'any') return Number.POSITIVE_INFINITY
  const nums = [...icon.sizes.matchAll(/(\d+)\s*x\s*(\d+)/g)].flatMap(m => [Number(m[1]), Number(m[2])])
  if (nums.length) return Math.max(...nums)
  if (icon.rel.includes('apple-touch-icon')) return 180
  return 0
}

// Every icon the page declares (`<link rel*=icon>`), resolved against `url` and ranked best-first.
// Monochrome `mask-icon` (a Safari pinned-tab glyph, not a preview icon) and hrefless links are
// dropped. Returns `{url, rel, sizes, type}` objects.
function favicons(source, url, cache) {
  return iconLinks(source, cache)
    .map(tag => ({
      url: typeof tag.href === 'string' ? cleanUrl(decode(tag.href), url) : undefined,
      rel: tag.rel.toLowerCase(), // always a string: a link matched by rel*=icon has a rel value
      sizes: (typeof tag.sizes === 'string' ? tag.sizes : '').toLowerCase(),
      type: (typeof tag.type === 'string' ? tag.type : '').toLowerCase()
    }))
    .filter(icon => icon.url && !icon.rel.includes('mask-icon'))
    .sort((a, b) => {
      const sa = iconScore(a)
      const sb = iconScore(b)
      return sa === sb ? 0 : sb - sa
    })
}

// The single best favicon URL. Falls back to `/favicon.ico` at the origin when the page declares
// no icon (the browser default), or `null` when there is nothing and no `url` to resolve against.
function favicon(source, url, cache) {
  const best = favicons(source, url, cache)[0]
  if (best) return best.url
  try {
    return url == null ? null : new URL('/favicon.ico', url).href
  } catch {
    return null
  }
}

// ---- the default rules (the opinion - overridable) ----------------------------------------
// A superset of the fields a rich link-preview card wants. Every one is pure extraction over the
// same one-scan parse, so the card is wide at no real speed or size cost. `publisher` is the
// site name (og:site_name); `icon`, `domain` and `contentType` are added by metadata() below.
const rules = {
  title: {text: [meta('og:title', 'twitter:title'), ld('headline', 'name'), content('title')]},
  description: {text: [meta('og:description', 'description', 'twitter:description'), ld('description')]},
  image: {url: [meta('og:image', 'twitter:image'), ldUrl('image', 'thumbnailUrl')]},
  imageAlt: {text: [meta('og:image:alt')]},
  imageWidth: {raw: [meta('og:image:width')]},
  imageHeight: {raw: [meta('og:image:height')]},
  url: {url: [meta('og:url'), link('canonical'), ld('url')]},
  type: {raw: [meta('og:type')]},
  author: {text: [meta('author', 'article:author'), ldName('author')]},
  date: {raw: [meta('article:published_time', 'date'), ld('datePublished', 'dateModified', 'uploadDate')]},
  publisher: {text: [meta('og:site_name'), ldName('publisher')]},
  keywords: {text: [meta('keywords')]},
  locale: {raw: [meta('og:locale')]},
  themeColor: {raw: [meta('theme-color')]},
  twitterCard: {raw: [meta('twitter:card')]},
  video: {url: [meta('og:video', 'og:video:url', 'og:video:secure_url')]},
  audio: {url: [meta('og:audio', 'og:audio:secure_url')]}
}

// ---- batteries-included entry: metadata(source, url, options?) uses the default rules ---------
// With the default rules it also adds a best-effort `icon`, `domain`, `lang` and `contentType`,
// which the declarative rules can't express. `options`:
//   - `rules`           run the pure engine with your own rules table instead (no icon/... fields);
//   - `oembedDiscovery` also add `oembedUrl`, the page's oEmbed discovery endpoint (a
//     `<link type=application/json+oembed>`). It only EXTRACTS the URL - it fetches nothing. Off by
//     default: a preview card already has title/image/description from the OG tags, so this is only
//     worth it when you want the embed markup (fetch `oembedUrl` with hypertag/fetch's `oembed()`),
//     or for URLs you can't scrape at all (hypertag/oembed's registry).
const runDefault = extract.compile(rules)
function metadata(source, url, options = {}) {
  const {rules: ruleset, oembedDiscovery = false} = options
  if (ruleset) {
    return extract(source, url, ruleset)
  }
  // One parse memo shared across the engine, the favicon scan and the oembed lookup, so the whole
  // card is built from a single scan of each tag type.
  const cache = new Map()
  const result = runDefault(source, url, cache)
  result.icon = favicon(source, url, cache)
  result.domain = hostname(result.url ?? url)
  result.lang = langOf(source) ?? (result.locale ? result.locale.split(/[-_]/)[0] : null)
  if (oembedDiscovery) result.oembedUrl = oembedOf(source, url, cache)
  result.contentType = contentType(result)
  return result
}

// The page's oEmbed discovery endpoint (a `<link>` of type `application/json+oembed`), resolved
// against the page URL, or null when the page advertises none. Off by default (see metadata()).
const oembedLink = select.compile('link[type=application/json+oembed]')
function oembedOf(source, url, cache) {
  const tag = oembedLink(source, cache)[0]
  return tag && typeof tag.href === 'string' ? cleanUrl(decode(tag.href), url) : null
}

// The host of the resolved page URL (falling back to the base), or null when neither parses.
function hostname(value) {
  if (value == null) return null
  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

// A coarse content type, mirroring the common link-preview convention: media wins, then an
// article signal (og:type or a publish date), else the declared og:type, else "website".
function contentType(result) {
  if (result.video) return 'video'
  if (result.audio) return 'audio'
  if (result.type === 'article' || result.date) return 'article'
  return result.type || 'website'
}

// The document language from `<html lang="...">`. A non-global exec stops at the first match, and
// `<html>` sits at the top of the document, so this reads the language without scanning the page.
const langPattern = /<html[^>]*\slang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
function langOf(source) {
  const match = langPattern.exec(source)
  if (!match) return null
  const value = match[1] ?? match[2] ?? match[3]
  return value === '' ? null : value
}

// The default export stays the callable `metadata`, with the engine, source helpers, default
// rules and favicon functions attached as properties for parity with the CommonJS shape.
Object.assign(metadata, {
  metadata,
  extract,
  rules,
  meta,
  link,
  content,
  attr,
  ld,
  ldName,
  ldUrl,
  favicon,
  favicons
})

export default metadata
export {metadata, extract, rules, meta, link, content, attr, ld, ldName, ldUrl, favicon, favicons}
