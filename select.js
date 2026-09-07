// Opt-in CSS-like selector layer over the core parser. A single-element selector
// (`tag[attr op value]...`) compiles to a `parse` call plus a `.filter(...)` predicate:
//
//   select(source, 'link[rel=alternate]') ≈ parse(source, 'link').filter(({rel}) => rel?.toLowerCase() === 'alternate')
//
// Attribute name AND value matching are CASE-INSENSITIVE by default. That mirrors how a real
// HTML pipeline behaves (the parser lowercases attribute names; metascraper matches meta
// values with the CSS `i` flag) and suits messy metadata (`OG:Title`, `Shortcut Icon`). It is
// a deliberate divergence from CSS, which matches attribute values case-sensitively. Append
// the CSS Level 4 `s` flag to a clause to force case-sensitive matching: `[href=Logo.PNG s]`.
//
// No tree, no combinators, no DOM. hypertag returns a flat list of matched opening
// tags, so a selector is only ever a tag name (the parse argument) plus attribute
// conditions (the predicate). Combinators and comma groups are rejected, not ignored.
const parse = require('./hypertag.js')

// The leading tag name, or `*`, or nothing (an omitted tag means `*`). parse() already
// matches tag names case-insensitively (its regex carries the `i` flag).
const tagPattern = /^([\w-]+|\*)?/
// One `[name op value flag]` clause. Shares a lastIndex like hypertag's own attrPattern.
//   1=name  2=op (undefined ⇒ presence)  3=dq value  4=sq value  5=unquoted value  6=i/s flag
const clausePattern =
  /\[\s*([\w-]+)\s*(?:([~^$*|!]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*))\s*([iIsS])?\s*)?\]/g

// Attribute-value operators. `v` is the attribute's string value (valueless attrs are
// coerced to ''); `value` is the selector operand. Semantics follow CSS attribute selectors.
const operators = {
  '=': (v, value) => v === value,
  '!=': (v, value) => v !== value,
  '^=': (v, value) => value !== '' && v.startsWith(value),
  '$=': (v, value) => value !== '' && v.endsWith(value),
  '*=': (v, value) => value !== '' && v.includes(value),
  '~=': (v, value) => value !== '' && !/\s/.test(value) && v.split(/\s+/).includes(value),
  '|=': (v, value) => v === value || v.startsWith(`${value}-`)
}

module.exports = select
Object.assign(module.exports, {
  select,
  compile: select.compile
})

function select(source, selector, options) {
  return select.compile(selector, options)(source)
}

select.compile = (selector, options) => {
  const {tag, conditions} = compile(selector)
  const predicate = toPredicate(conditions)
  return source => parse(source, tag, options).filter(predicate)
}

// Named shortcuts for the selectors people reach for most, each a pre-baked `select` that
// returns raw `Tag[]` (hypertag hands back tags, not cooked values - you map them yourself).
// `title` and `jsonld` are content-aware: they turn on the core `content` option, so each
// result carries the element's content under the `>` key (the JSON-LD text, ready to
// JSON.parse; a title's raw text, ready to run through hypertag/sanitize's `decode`).
Object.assign(select, {
  og: select.compile('meta[property^=og:]'),
  twitter: select.compile('meta[name^=twitter:]'),
  icons: select.compile('link[rel*=icon]'),
  canonical: select.compile('link[rel=canonical]'),
  stylesheets: select.compile('link[rel~=stylesheet]'),
  alternates: select.compile('link[rel~=alternate]'),
  title: select.compile('title', {content: true}),
  jsonld: select.compile('script[type*=ld+json]', {content: true})
})

function compile(selector) {
  if (typeof selector !== 'string') {
    throw new TypeError(`hypertag/select: selector must be a string, got ${typeof selector}`)
  }

  const s = selector.trim()
  const lead = tagPattern.exec(s)
  const tag = lead[1] || '*'

  const conditions = []
  clausePattern.lastIndex = lead[0].length
  let consumed = lead[0].length
  let match
  while ((match = clausePattern.exec(s)) !== null) {
    // A gap before this clause means unparsed input (a combinator, comma, or junk).
    if (match.index !== consumed) {
      break
    }
    // Case-insensitive by default; a trailing `s`/`S` flag forces case-sensitive. When
    // insensitive, lower-case the name and operand once here so matching stays cheap.
    const caseSensitive = match[6] === 's' || match[6] === 'S'
    const rawValue = match[3] ?? match[4] ?? match[5]
    conditions.push({
      name: caseSensitive ? match[1] : match[1].toLowerCase(),
      op: match[2],
      value: caseSensitive || rawValue == null ? rawValue : rawValue.toLowerCase(),
      caseSensitive
    })
    consumed = clausePattern.lastIndex
  }

  if (consumed !== s.length) {
    throw new TypeError(
      `hypertag/select: unsupported or malformed selector ${JSON.stringify(selector)} ` +
        '(combinators, comma groups, and .class/#id shorthands are not supported)'
    )
  }
  return {tag, conditions}
}

function toPredicate(conditions) {
  return tag =>
    conditions.every(({name, op, value, caseSensitive}) => {
      const raw = lookup(tag, name, caseSensitive)
      const present = raw !== undefined
      if (!op) {
        return present // [attr] presence: key exists (valueless true and '' both count)
      }
      if (!present) {
        return op === '!=' // absent key: only "not equal" holds, per CSS/jQuery
      }
      let v = raw === true ? '' : raw // valueless attr coerces to '' for value comparison
      if (!caseSensitive) {
        v = v.toLowerCase() // operand was already lower-cased at compile time
      }
      return operators[op](v, value)
    })
}

// Find an attribute's value by name. Case-insensitive by default (attribute names in HTML
// are case-insensitive, and hypertag preserves the source's case); `name` is pre-lowered by
// the compiler for that path. Returns `undefined` when absent.
function lookup(tag, name, caseSensitive) {
  if (caseSensitive) {
    return Object.hasOwn(tag, name) ? tag[name] : undefined
  }
  for (const key of Object.keys(tag)) {
    if (key.toLowerCase() === name) {
      return tag[key]
    }
  }
  return undefined
}
