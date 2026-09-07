// Opt-in CSS-like selector layer over the core parser. A single-element selector
// (`tag[attr op value]...`) compiles to a `parse` call plus a `.filter(...)` predicate:
//
//   select(source, 'link[rel=alternate]') === parse(source, 'link').filter(({rel}) => rel === 'alternate')
//
// No tree, no combinators, no DOM. hypertag returns a flat list of matched opening
// tags, so a selector is only ever a tag name (the parse argument) plus attribute
// conditions (the predicate). Combinators and comma groups are rejected, not ignored.
const parse = require('./hypertag.js')

// The leading tag name, or `*`, or nothing (an omitted tag means `*`).
const tagPattern = /^([\w-]+|\*)?/
// One `[name op value]` clause. Shares a lastIndex like hypertag's own attrPattern.
//   1=name  2=op (undefined ⇒ presence)  3=dq value  4=sq value  5=unquoted value
const clausePattern =
  /\[\s*([\w-]+)\s*(?:([~^$*|!]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*))\s*)?\]/g

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
    conditions.push({
      name: match[1],
      op: match[2],
      value: match[3] ?? match[4] ?? match[5]
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
    conditions.every(({name, op, value}) => {
      const present = Object.hasOwn(tag, name)
      if (!op) {
        return present // [attr] presence: key exists (valueless true and '' both count)
      }
      if (!present) {
        return op === '!=' // absent key: only "not equal" holds, per CSS/jQuery
      }
      const raw = tag[name]
      const v = raw === true ? '' : raw // valueless attr coerces to '' for value comparison
      return operators[op](v, value)
    })
}
