// Size: how much JavaScript you ship to do the task. For each library, bundle a
// minimal entry that imports it and runs the extraction, minify, gzip, and
// report the bytes. Node built-ins are marked external (esbuild does this for
// platform:node), so this counts the library's own JavaScript, not Node itself.
import {gzipSync} from 'node:zlib'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {importSnippets} from './parsers.mjs'

const resolveDir = fileURLToPath(new URL('.', import.meta.url))
const rows = []

for (const [name, contents] of Object.entries(importSnippets)) {
  try {
    const result = await build({
      stdin: {contents, resolveDir, loader: 'js'},
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'node',
      external: ['canvas'], // jsdom optional native dep, never bundled
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

console.log('bundled size to use this capability (esbuild --bundle --minify, esm, node built-ins external):')
const smallest = rows.find(r => r.gz != null)?.gz
for (const r of rows) {
  if (r.error) {
    console.log(`  ${r.name.padEnd(18)} could not bundle: ${r.error}`)
    continue
  }
  const kbMin = (r.min / 1024).toFixed(1)
  const kbGz = (r.gz / 1024).toFixed(1)
  const factor = smallest ? Math.round(r.gz / smallest) : 1
  console.log(`  ${r.name.padEnd(18)} ${kbGz.padStart(8)} kB gz  (${kbMin} kB min, ${factor}x the smallest)`)
}
