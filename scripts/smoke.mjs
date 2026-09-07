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

// The opt-in selector layer: the default import is the callable select function, and the
// named exports resolve.
const selectMod = await import('../select.mjs')
assert.strictEqual(typeof selectMod.default, 'function', 'import default must be the select function')
for (const name of ['select', 'compile']) {
  assert.strictEqual(typeof selectMod[name], 'function', `missing named export: ${name}`)
}
assert.deepStrictEqual(
  selectMod.default('<link rel="alternate" href="/x"><link rel="stylesheet">', 'link[rel=alternate]'),
  [{'<': 'link', rel: 'alternate', href: '/x'}],
  'select() smoke result mismatch'
)

console.log('smoke: ESM import OK')
