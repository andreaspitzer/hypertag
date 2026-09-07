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
assert.deepStrictEqual(
  parse('<title>Hi</title>', 'title', {content: true}),
  [{'<': 'title', '>': 'Hi'}],
  'parse() content option smoke mismatch'
)

// The opt-in selector layer: require('hypertag/select') is the callable select function
// with `select` and `compile` attached.
const select = require('../select.js')
assert.strictEqual(typeof select, 'function', 'require() default must be the select function')
for (const name of ['select', 'compile', 'og', 'jsonld']) {
  assert.strictEqual(typeof select[name], 'function', `missing named export: ${name}`)
}
assert.deepStrictEqual(
  select('<link rel="alternate" href="/x"><link rel="stylesheet">', 'link[rel=alternate]'),
  [{'<': 'link', rel: 'alternate', href: '/x'}],
  'select() smoke result mismatch'
)
assert.strictEqual(
  select.jsonld('<script type="application/ld+json">{"a":1}</script>')[0]['>'],
  '{"a":1}',
  'select.jsonld() preset smoke mismatch'
)

// The opt-in sanitize layer: require('hypertag/sanitize') is the callable sanitize function
// with `sanitize`, `decode` and `cleanUrl` attached.
const sanitize = require('../sanitize.js')
for (const name of ['sanitize', 'decode', 'cleanUrl']) {
  assert.strictEqual(typeof sanitize[name], 'function', `missing named export: ${name}`)
}
assert.strictEqual(sanitize.decode('a &amp; b &#151; c'), 'a & b — c', 'decode() smoke mismatch')
assert.deepStrictEqual(
  sanitize(parse('<meta name="x" content="Rock &amp; Roll">', 'meta')),
  [{'<': 'meta', name: 'x', content: 'Rock & Roll'}],
  'sanitize() smoke result mismatch'
)

console.log('smoke: CJS require() OK')
