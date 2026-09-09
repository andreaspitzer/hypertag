// Opt-in JSON-LD layer. This is the first code in hypertag that reads JSON rather than HTML:
// it takes the JSON-LD `<script type="application/ld+json">` bodies the core `content` option
// exposes, parses them, and hands back plain objects to pick fields from. It knows nothing
// about which field means what - that is the caller's (or the meta layer's) job. Zero deps.
import parse from './parse.js'

// Flatten every JSON-LD block on the page (and each block's `@graph`) into one list of objects
// to pick from. A block whose body is not valid JSON is skipped, so one broken block never
// throws the whole page; non-object JSON (a bare string or number) contributes nothing.
function ld(source, cache) {
  return parse(source, 'script', {content: true}, cache)
    .filter(s => /ld\+json/i.test(typeof s.type === 'string' ? s.type : ''))
    .flatMap(s => {
      let json
      try {
        json = JSON.parse(s.$content)
      } catch {
        return []
      }
      if (Array.isArray(json)) return json
      if (json && typeof json === 'object') return json['@graph'] ?? [json]
      return []
    })
}

// First present value in `graph` for any of `keys`, scanning objects in order then keys in
// order. `undefined` if no object carries any of the keys.
function pick(graph, ...keys) {
  for (const obj of graph) {
    for (const key of keys) {
      if (obj != null && obj[key] != null) return obj[key]
    }
  }
  return undefined
}

// Coerce the shapes JSON-LD uses for a person/organization - a string, an object with a
// `name`, or an array of either - down to a single name. Returns the input unchanged if it is
// neither an array nor an object.
function asName(value) {
  if (Array.isArray(value)) return asName(value[0])
  if (value && typeof value === 'object') return value.name
  return value
}

// Coerce the shapes JSON-LD uses for an image/URL - a string, an object with `url` or
// `contentUrl`, or an array - down to a single URL string.
function asUrl(value) {
  if (Array.isArray(value)) return asUrl(value[0])
  if (value && typeof value === 'object') return value.url ?? value.contentUrl
  return value
}

// The default export stays the callable `ld`, with the helpers attached as properties for
// parity with the previous CommonJS shape (the meta layer reads `ld.pick`, `ld.asName`, ...).
Object.assign(ld, {ld, pick, asName, asUrl})

export default ld
export {ld, pick, asName, asUrl}
