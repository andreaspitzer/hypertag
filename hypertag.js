const attrPattern = /([\w\-_]+)(?:\s*:?=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gims
const commentPattern = /<!--[\s\S]*?-->/g

module.exports = parse
Object.assign(module.exports, {
  parse,
  parseAttrs,
  stripComments,
  extend,
})

function extend(tags, options) {
  options = {...options}
  return source => parse(source, tags, options)
}

function parse(source, tags, options) {
  tags = Array.isArray(tags) ? tags : [tags]
  tags = tags.map(tag => tag === '*' ? '[^/\\s>]+' : tag)
  options = {
    tagKey: '$tag',
    contentKey: '$content',
    ...options,
  }

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
