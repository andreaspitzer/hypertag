// Core layer (layer 0): the bare tag + attribute parser. One string scan returns a flat
// `Tag[]`, zero dependencies, edge-sized. Exposed at `hypertag/parse`.
const attrPattern = /([\w\-_]+)(?:\s*:?=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gims
const commentPattern = /<!--[\s\S]*?-->/g

function extend(tags, options) {
  options = {...options}
  return source => parse(source, tags, options)
}

// `cache`, when given, is a caller-owned Map used to memoize identical (source, tags, mode)
// parses - so many scans of the same page collapse to one. It carries no shared or module-level
// state: create a fresh Map per logical operation and thread it through. Passing nothing (the
// normal case) parses without memoizing. This is what makes caching safe under any async
// interleaving - each operation owns its cache, so concurrent operations never mix.
function parse(source, tags, options, cache) {
  tags = Array.isArray(tags) ? tags : [tags]
  tags = tags.map(tag => (tag === '*' ? '[^/\\s>]+' : tag))
  options = {
    tagKey: '$tag',
    contentKey: '$content',
    ...options
  }

  if (!cache) {
    return run(source, tags, options)
  }
  const key = `${options.content ? 'c' : ''}${options.tagKey} ${options.contentKey} ${tags.join('|')}`
  let bySource = cache.get(source)
  if (!bySource) {
    bySource = new Map()
    cache.set(source, bySource)
  }
  if (bySource.has(key)) {
    return bySource.get(key)
  }
  const result = run(source, tags, options)
  bySource.set(key, result)
  return result
}

function run(source, tags, options) {
  if (options.content) {
    return parseWithContent(source, tags, options)
  }

  const pattern = new RegExp(`<(?:${tags.join('|')})(?:\\s+[^>]*)?>`, 'igms')
  return (stripComments(source).match(pattern) || [])
    .map(tag => parseAttrs(tag, options.tagKey))
    .filter(x => x)
}

// Also capture each element's content, up to its matching close tag (a backreference to the
// opened tag name, case-insensitive). Correct for HTML raw-text (script, style) and escapable
// raw-text (title, textarea) elements; for elements that can nest it is best-effort and stops
// at the first close tag. Runs on the RAW source (not comment-stripped) so raw-text content -
// e.g. a JSON-LD `<script>` body - is preserved verbatim. An unclosed element simply does not
// match, so malformed input yields fewer results rather than throwing or hanging.
function parseWithContent(source, tags, options) {
  const pattern = new RegExp(`(<(${tags.join('|')})(?:\\s+[^>]*)?>)([\\s\\S]*?)</\\2\\s*>`, 'igms')
  const results = []
  for (const match of source.matchAll(pattern)) {
    const attrs = parseAttrs(match[1], options.tagKey)
    if (attrs) {
      attrs[options.contentKey] = match[3]
      results.push(attrs)
    }
  }
  return results
}

function parseAttrs(htmlTagText, tagKey = '$tag') {
  const attrs = {}

  attrPattern.lastIndex = 0
  let match = attrPattern.exec(htmlTagText)
  if (!match) {
    return
  }
  attrs[tagKey] = match[1]

  while ((match = attrPattern.exec(htmlTagText)) !== null) {
    const key = match[1]
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? true
  }
  return attrs
}

function stripComments(html) {
  return html.indexOf('<!--') === -1 ? html : html.replace(commentPattern, '')
}

// The default export stays the callable `parse`, with the named helpers also attached as
// properties so `import parse from 'hypertag/parse'` gives `parse`, `parse.parseAttrs`, ...
Object.assign(parse, {parse, parseAttrs, stripComments, extend})

export default parse
export {parse, parseAttrs, stripComments, extend}
