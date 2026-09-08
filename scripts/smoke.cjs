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
  [{$tag: 'meta', name: 'x', content: 'y'}],
  'parse() smoke result mismatch'
)
assert.strictEqual(parse.stripComments('a<!--b-->c'), 'ac', 'stripComments() smoke mismatch')
assert.deepStrictEqual(
  parse('<title>Hi</title>', 'title', {content: true}),
  [{$tag: 'title', $content: 'Hi'}],
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
  [{$tag: 'link', rel: 'alternate', href: '/x'}],
  'select() smoke result mismatch'
)
assert.deepStrictEqual(
  select('<link rel="canonical" href="/z"><meta property="og:title" content="T">', 'link[rel=canonical], meta[property^=og:]').map(el => el.$tag),
  ['link', 'meta'],
  'select() selector-list smoke mismatch'
)
assert.strictEqual(
  select.jsonld('<script type="application/ld+json">{"a":1}</script>')[0].$content,
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
  [{$tag: 'meta', name: 'x', content: 'Rock & Roll'}],
  'sanitize() smoke result mismatch'
)

// The opt-in JSON-LD layer: require('hypertag/ld') is the callable graph extractor with
// `ld`, `pick`, `asName` and `asUrl` attached.
const ld = require('../ld.js')
for (const name of ['ld', 'pick', 'asName', 'asUrl']) {
  assert.strictEqual(typeof ld[name], 'function', `missing named export: ${name}`)
}
assert.deepStrictEqual(
  ld('<script type="application/ld+json">{"headline":"Hi"}</script>'),
  [{headline: 'Hi'}],
  'ld() smoke result mismatch'
)

// The opt-in metadata layer: require('hypertag/meta') is the callable extractor with the
// engine, source helpers and default rules attached.
const metadata = require('../meta.js')
for (const name of ['metadata', 'extract', 'meta', 'link', 'content', 'ld', 'ldName', 'ldUrl']) {
  assert.strictEqual(typeof metadata[name], 'function', `missing named export: ${name}`)
}
assert.strictEqual(
  metadata('<meta property="og:title" content="Hi &amp; Bye">').title,
  'Hi & Bye',
  'metadata() smoke result mismatch'
)

console.log('smoke: CJS require() OK')
