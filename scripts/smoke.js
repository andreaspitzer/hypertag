// Smoke the ESM package as a consumer sees it (ESM-only, ADR-0002). Three shapes are checked:
// the `hypertag/parse` core entry (default is the callable parse), a granular subpath
// (`hypertag/meta`), and the batteries-included `hypertag` barrel (curated, named-only).
import assert from 'node:assert'
import parse, {parseAttrs, stripComments, extend} from '../parse.js'

// ---- hypertag/parse: the core entry -------------------------------------------------------
assert.strictEqual(typeof parse, 'function', 'import default must be the parse function')
for (const [name, fn] of Object.entries({parseAttrs, stripComments, extend})) {
  assert.strictEqual(typeof fn, 'function', `missing named export: ${name}`)
}
assert.deepStrictEqual(
  parse('<meta name="x" content="y">', 'meta'),
  [{$tag: 'meta', name: 'x', content: 'y'}],
  'parse() smoke result mismatch'
)
assert.strictEqual(stripComments('a<!--b-->c'), 'ac', 'stripComments() smoke mismatch')
assert.deepStrictEqual(
  parse('<title>Hi</title>', 'title', {content: true}),
  [{$tag: 'title', $content: 'Hi'}],
  'parse() content option smoke mismatch'
)

// ---- a granular subpath: hypertag/meta ----------------------------------------------------
const metaMod = await import('../meta.js')
assert.strictEqual(typeof metaMod.default, 'function', 'meta default must be the metadata function')
for (const name of ['metadata', 'extract', 'meta', 'link', 'content', 'ld', 'ldName', 'ldUrl', 'favicon', 'favicons']) {
  assert.strictEqual(typeof metaMod[name], 'function', `hypertag/meta missing named export: ${name}`)
}
assert.strictEqual(
  metaMod.default('<meta property="og:title" content="Hi &amp; Bye">').title,
  'Hi & Bye',
  'metadata() smoke result mismatch'
)
assert.strictEqual(
  metaMod.favicon('<link rel="apple-touch-icon" href="/a.png">', 'https://ex.com/'),
  'https://ex.com/a.png',
  'favicon() smoke mismatch'
)

// ---- the batteries-included barrel: hypertag ----------------------------------------------
const bag = await import('../index.js')
// The barrel is named-only (no default export).
assert.strictEqual(bag.default, undefined, 'the barrel must have no default export')
for (const name of [
  'parse', 'parseAttrs', 'stripComments', 'extend', 'select', 'sanitize', 'decode', 'cleanUrl',
  'ld', 'asName', 'asUrl', 'metadata', 'extract', 'rules', 'favicon', 'favicons', 'fromUrl',
  'oembed', 'oembedEndpoint', 'providers'
]) {
  assert.ok(name in bag, `hypertag barrel missing export: ${name}`)
}
// The colliding meta source-helpers and standalone pick/compile must NOT be on the barrel.
for (const name of ['meta', 'link', 'content', 'attr', 'ldName', 'ldUrl', 'pick', 'compile']) {
  assert.ok(!(name in bag), `hypertag barrel must not export: ${name}`)
}
// parse, metadata, fromUrl are importable and callable from the barrel.
assert.strictEqual(typeof bag.parse, 'function', 'barrel parse must be callable')
assert.strictEqual(typeof bag.metadata, 'function', 'barrel metadata must be callable')
assert.strictEqual(typeof bag.fromUrl, 'function', 'barrel fromUrl must be callable')
assert.strictEqual(
  bag.metadata('<meta property="og:title" content="Hi &amp; Bye">').title,
  'Hi & Bye',
  'barrel metadata() smoke result mismatch'
)
const card = await bag.fromUrl('https://ex.com/a', {
  fetch: async u => ({url: u, text: async () => '<meta property="og:title" content="Hi &amp; Bye">'})
})
assert.strictEqual(card.title, 'Hi & Bye', 'barrel fromUrl() smoke result mismatch')
assert.ok(
  bag.oembedEndpoint('https://www.tiktok.com/@u/video/1')?.startsWith('https://www.tiktok.com/oembed'),
  'barrel oembedEndpoint() smoke mismatch'
)

console.log('smoke: ESM import OK')
