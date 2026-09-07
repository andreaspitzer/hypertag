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
    tagKey: '<',
    ...options,
  }

  const pattern = new RegExp(`<(?:${tags.join('|')})(?:\\s+[^>]*)?>`, 'igms')
  return (stripComments(source).match(pattern) || [])
    .map(tag => parseAttrs(tag, options.tagKey))
    .filter(x => x)
}

function parseAttrs(htmlTagText, tagKey = '<') {
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
