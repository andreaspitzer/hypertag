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

console.log('smoke: CJS require() OK')
