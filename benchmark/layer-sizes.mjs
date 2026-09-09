// Layer sizes: what you ship when you import each hypertag entry point to do its job. For
// every public entry (the batteries-included barrel, the core, and the six opt-in layers),
// bundle a snippet that imports the entry the way a consumer uses it and sinks the result,
// minify, gzip, and report the bytes. This is the honest "you import X -> ships Y" figure
// the README's per-layer table quotes.
//
// One methodology, matching benchmark/edge-libs/footprint.mjs so the numbers agree across
// the README (C4): esbuild --bundle --minify, esm, node built-ins external (`canvas` is
// jsdom's optional native dep and is never bundled), with ESM tree-shaking on
// (`sideEffects:false`) - so each row is that entry used for its job, not every named export
// force-kept. The barrel row is the whole batteries-included API (its "job" is everything).
// Entries resolve by relative path to the published root files, the same way
// benchmark/size.mjs resolves the core, so this needs no installed `hypertag` and stays
// reproducible from a clean tree.
import {gzipSync} from 'node:zlib'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'

const resolveDir = fileURLToPath(new URL('.', import.meta.url))

// [import specifier shown to the reader, use-the-entry snippet]. Order matches the README
// table: barrel first, then core, then the layers smallest-first. Each snippet imports what
// a consumer of that entry actually reaches for and sinks it so the bundler cannot drop it.
const entries = [
  ['hypertag', `import * as ns from '../index.js'; globalThis.__sink = ns`],
  ['hypertag/parse', `import {parse} from '../parse.js'; globalThis.__sink = parse('<html></html>', 'meta')`],
  ['hypertag/ld', `import ld from '../ld.js'; globalThis.__sink = ld('<html></html>')`],
  ['hypertag/sanitize', `import {sanitize, cleanUrl} from '../sanitize.js'; globalThis.__sink = [sanitize('x'), cleanUrl('x')]`],
  ['hypertag/oembed', `import {oembedEndpoint} from '../oembed.js'; globalThis.__sink = oembedEndpoint('https://example.com')`],
  ['hypertag/select', `import select, {pick} from '../select.js'; globalThis.__sink = [select('<html></html>', 'a'), pick]`],
  ['hypertag/meta', `import {metadata} from '../meta.js'; globalThis.__sink = metadata('<html></html>', 'https://example.com')`],
  ['hypertag/fetch', `import {fromUrl} from '../fetch.js'; globalThis.__sink = fromUrl`]
]

const rows = []
for (const [name, contents] of entries) {
  try {
    const result = await build({
      stdin: {contents, resolveDir, loader: 'js'},
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'node',
      external: ['canvas'],
      write: false,
      logLevel: 'silent'
    })
    const min = result.outputFiles[0].contents
    rows.push({name, min: min.length, gz: gzipSync(min).length})
  } catch (error) {
    rows.push({name, error: String(error.message || error).split('\n')[0]})
  }
}

console.log('hypertag entry-point sizes (esbuild --bundle --minify, esm, node built-ins external):\n')
console.log('| you import | ships (gzipped) |')
console.log('| --- | ---: |')
for (const r of rows) {
  if (r.error) {
    console.log(`| \`${r.name}\` | could not bundle: ${r.error} |`)
    continue
  }
  const kbGz = (r.gz / 1024).toFixed(1)
  console.log(`| \`${r.name}\` | ${kbGz} kB |`)
}
console.log('\nraw bytes (gzipped / minified):')
for (const r of rows) {
  if (r.error) continue
  console.log(`  ${r.name.padEnd(20)} ${String(r.gz).padStart(6)} B gz  (${r.min} B min)`)
}
