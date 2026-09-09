// Size claim gate (CI): the README promises a per-layer "you import X -> ships Y (gzipped)"
// table (~5 kB overall, 0.7 kB /parse, 5.0 kB /meta, ...). This gate re-measures each public
// entry point the SAME way benchmark/layer-sizes.mjs does - esbuild --bundle --minify, esm,
// tree-shaken - gzips it, and FAILS (non-zero exit) if any layer's gzipped bytes exceed its
// committed budget in ./budgets.mjs. The budgets back the README table with a little headroom,
// so an honest refactor stays green but a regression that bloats a layer past what the README
// claims turns CI red.
//
// Size is deterministic (no network, no timing), so this is a hard gate - unlike speed/memory,
// which the benchmark/ suite only TRACKS (see .github/workflows/claims.yml). Run it directly
// with `npm run claims:size`; set CLAIMS_MEASURE=1 to print the current bytes without asserting
// (how the budgets in ./budgets.mjs were seeded).
import {gzipSync} from 'node:zlib'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'

// Bundle each entry from the published SOURCE files at the repo root (export resolution is
// covered separately by the edge tier-1 tests); resolveDir is the repo root so the snippets
// import './index.js' etc. directly, needing no installed `hypertag`.
const resolveDir = fileURLToPath(new URL('../../', import.meta.url))

// [entry label (README wording), a snippet that USES the entry the way a consumer does, so the
// bundler cannot tree-shake the work away]. Order matches the README table.
const entries = [
  ['hypertag', `import * as ns from './index.js'; globalThis.__sink = ns`],
  ['hypertag/parse', `import {parse} from './parse.js'; globalThis.__sink = parse('<html></html>', 'meta')`],
  ['hypertag/ld', `import ld from './ld.js'; globalThis.__sink = ld('<html></html>')`],
  ['hypertag/sanitize', `import {sanitize, cleanUrl} from './sanitize.js'; globalThis.__sink = [sanitize('x'), cleanUrl('x')]`],
  ['hypertag/oembed', `import {oembedEndpoint} from './oembed.js'; globalThis.__sink = oembedEndpoint('https://example.com')`],
  ['hypertag/select', `import select, {pick} from './select.js'; globalThis.__sink = [select('<html></html>', 'a'), pick]`],
  ['hypertag/meta', `import {metadata} from './meta.js'; globalThis.__sink = metadata('<html></html>', 'https://example.com')`],
  ['hypertag/fetch', `import {fromUrl} from './fetch.js'; globalThis.__sink = fromUrl`]
]

async function measure() {
  const rows = []
  for (const [name, contents] of entries) {
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
    rows.push({name, gz: gzipSync(min).length})
  }
  return rows
}

const rows = await measure()

// Measure mode: print the current gzipped bytes and exit (used to seed ./budgets.mjs).
if (process.env.CLAIMS_MEASURE) {
  console.log('measured gzipped bytes per entry (esbuild --bundle --minify, esm):\n')
  for (const r of rows) console.log(`  ${r.name.padEnd(20)} ${String(r.gz).padStart(6)} B`)
  process.exit(0)
}

const {BUDGETS} = await import('./budgets.mjs')

console.log('size claim gate - gzipped ship size vs committed budget:\n')
console.log('  entry                 measured    budget   headroom')
let failed = 0
for (const {name, gz} of rows) {
  const budget = BUDGETS[name]
  if (budget == null) {
    console.error(`  ${name.padEnd(20)}  ${String(gz).padStart(6)} B   (no budget defined - add it to budgets.mjs)`)
    failed++
    continue
  }
  const over = gz > budget
  const slack = budget - gz
  const mark = over ? 'OVER' : 'ok'
  console.log(
    `  ${name.padEnd(20)} ${String(gz).padStart(6)} B  ${String(budget).padStart(6)} B  ${String(slack).padStart(5)} B  ${mark}`
  )
  if (over) failed++
}

if (failed) {
  console.error(
    `\nsize claim gate FAILED: ${failed} entr${failed === 1 ? 'y' : 'ies'} over budget. ` +
      'A layer ships more than the README claims - shrink it, or if the growth is intended, ' +
      'update ./budgets.mjs AND the README size table together.'
  )
  process.exit(1)
}
console.log('\nsize claim gate OK: every layer ships within its README-backed budget.')
