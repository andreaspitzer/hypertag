// Smoke test the *built* package: catches a broken exports map or a
// mis-emitted dist artifact that the source-level unit tests never load.
const assert = require('node:assert')
const parse = require('../dist/index.js')

assert.strictEqual(typeof parse, 'function', 'default export must be the parse function')
for (const name of ['parse', 'parseAttrs', 'stripComments', 'extend']) {
  assert.strictEqual(typeof parse[name], 'function', `missing named export: ${name}`)
}

assert.deepStrictEqual(
  parse('<meta name="x" content="y">', 'meta'),
  [{'<': 'meta', name: 'x', content: 'y'}],
  'parse() smoke result mismatch'
)
assert.strictEqual(parse.stripComments('a<!--b-->c'), 'ac', 'stripComments() smoke mismatch')

console.log('smoke: built dist CJS exports OK')
