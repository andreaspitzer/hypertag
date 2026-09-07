// Smoke the ESM entry as a consumer sees it: the default `import` must be the
// callable parse function, and the named exports must resolve.
import assert from 'node:assert'
import parse, {parseAttrs, stripComments, extend} from '../hypertag.mjs'

assert.strictEqual(typeof parse, 'function', 'import default must be the parse function')
for (const [name, fn] of Object.entries({parseAttrs, stripComments, extend})) {
  assert.strictEqual(typeof fn, 'function', `missing named export: ${name}`)
}

assert.deepStrictEqual(
  parse('<meta name="x" content="y">', 'meta'),
  [{'<': 'meta', name: 'x', content: 'y'}],
  'parse() smoke result mismatch'
)
assert.strictEqual(stripComments('a<!--b-->c'), 'ac', 'stripComments() smoke mismatch')

console.log('smoke: ESM import OK')
