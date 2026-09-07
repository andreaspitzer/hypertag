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
assert.deepStrictEqual(
  parse('<title>Hi</title>', 'title', {content: true}),
  [{'<': 'title', '>': 'Hi'}],
  'parse() content option smoke mismatch'
)

// The opt-in selector layer: the default import is the callable select function, and the
// named exports resolve.
const selectMod = await import('../select.mjs')
assert.strictEqual(typeof selectMod.default, 'function', 'import default must be the select function')
for (const name of ['select', 'compile', 'og', 'jsonld']) {
  assert.strictEqual(typeof selectMod[name], 'function', `missing named export: ${name}`)
}
assert.strictEqual(
  selectMod.jsonld('<script type="application/ld+json">{"a":1}</script>')[0]['>'],
  '{"a":1}',
  'select.jsonld() preset smoke mismatch'
)
assert.deepStrictEqual(
  selectMod.default('<link rel="alternate" href="/x"><link rel="stylesheet">', 'link[rel=alternate]'),
  [{'<': 'link', rel: 'alternate', href: '/x'}],
  'select() smoke result mismatch'
)

// The opt-in sanitize layer: default import is the callable sanitize function, named exports resolve.
const sanitizeMod = await import('../sanitize.mjs')
assert.strictEqual(typeof sanitizeMod.default, 'function', 'import default must be the sanitize function')
for (const name of ['sanitize', 'decode', 'cleanUrl']) {
  assert.strictEqual(typeof sanitizeMod[name], 'function', `missing named export: ${name}`)
}
assert.strictEqual(sanitizeMod.decode('a &amp; b &#151; c'), 'a & b — c', 'decode() smoke mismatch')
assert.deepStrictEqual(
  sanitizeMod.default(parse('<meta name="x" content="Rock &amp; Roll">', 'meta')),
  [{'<': 'meta', name: 'x', content: 'Rock & Roll'}],
  'sanitize() smoke result mismatch'
)

console.log('smoke: ESM import OK')
