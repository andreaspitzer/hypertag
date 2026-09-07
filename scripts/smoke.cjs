// Smoke the CommonJS entry as a consumer sees it: `require('hypertag')` must
// be the callable parse function with the named helpers attached.
const assert = require('node:assert')
const parse = require('../hypertag.js')

assert.strictEqual(typeof parse, 'function', 'require() default must be the parse function')
for (const name of ['parse', 'parseAttrs', 'stripComments', 'extend']) {
  assert.strictEqual(typeof parse[name], 'function', `missing named export: ${name}`)
}

assert.deepStrictEqual(
  parse('<meta name="x" content="y">', 'meta'),
  [{'<': 'meta', name: 'x', content: 'y'}],
  'parse() smoke result mismatch'
)
assert.strictEqual(parse.stripComments('a<!--b-->c'), 'ac', 'stripComments() smoke mismatch')

// The opt-in selector layer: require('hypertag/select') is the callable select function
// with `select` and `compile` attached.
const select = require('../select.js')
assert.strictEqual(typeof select, 'function', 'require() default must be the select function')
for (const name of ['select', 'compile']) {
  assert.strictEqual(typeof select[name], 'function', `missing named export: ${name}`)
}
assert.deepStrictEqual(
  select('<link rel="alternate" href="/x"><link rel="stylesheet">', 'link[rel=alternate]'),
  [{'<': 'link', rel: 'alternate', href: '/x'}],
  'select() smoke result mismatch'
)

console.log('smoke: CJS require() OK')
