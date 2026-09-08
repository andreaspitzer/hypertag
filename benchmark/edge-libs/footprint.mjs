// Footprint: what you ship to the edge to do the link-preview job with each library.
// For each contender, bundle a minimal entry that imports it and runs its extraction/preview
// entry point, minify, gzip, and report the bytes. Node built-ins are marked external
// (platform:node), so this counts the library's own JavaScript + its bundled deps, not Node.
//
// Note on scope: hypertag/meta and open-graph-scraper-lite take HTML you already have (pure
// extraction). linkpeek and openlink take a URL and fetch it themselves (fetch + extract) - a
// category up. They're included here for the honest ship-size picture, not because they do the
// identical task.
import {gzipSync} from 'node:zlib'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'

const resolveDir = fileURLToPath(new URL('.', import.meta.url))

// Minimal use-the-capability snippet per library (import + a call the bundler can't tree-shake).
const snippets = {
  'hypertag/meta': `
    import metadata from 'hypertag/meta'
    globalThis.__sink = metadata('<html></html>', 'https://example.com')
  `,
  'open-graph-scraper-lite': `
    import ogs from 'open-graph-scraper-lite'
    globalThis.__sink = ogs({html: '<html></html>'})
  `,
  linkpeek: `
    import {preview} from 'linkpeek'
    globalThis.__sink = preview
  `,
  openlink: `
    import {preview} from 'openlink'
    globalThis.__sink = preview
  `
}

const rows = []
for (const [name, contents] of Object.entries(snippets)) {
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

rows.sort((a, b) => (a.gz ?? Infinity) - (b.gz ?? Infinity))
const smallest = rows.find(r => r.gz != null)?.gz

console.log('ship size to do the job (esbuild --bundle --minify, esm, node built-ins external):\n')
for (const r of rows) {
  if (r.error) {
    console.log(`  ${r.name.padEnd(24)} could not bundle: ${r.error}`)
    continue
  }
  const kbGz = (r.gz / 1024).toFixed(1)
  const kbMin = (r.min / 1024).toFixed(1)
  const factor = smallest ? (r.gz / smallest).toFixed(1) : '1'
  console.log(`  ${r.name.padEnd(24)} ${kbGz.padStart(7)} kB gz  (${kbMin} kB min, ${factor}x the smallest)`)
}
