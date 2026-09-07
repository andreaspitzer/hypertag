// Memory: peak RSS and retained heap for "load the library and extract the tags",
// measured with one child process per library so nothing else is loaded. Run
// with --expose-gc in the child so the retained figure is after a full GC.
// Memory numbers are the noisiest of the three benchmarks; treat them as an
// order-of-magnitude comparison, not a precise measurement.
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {NAMES, loadOne} from './parsers.mjs'

const RUNS = 20
const selfPath = fileURLToPath(import.meta.url)
const fixture = new URL('../test/fixture-twitter.html', import.meta.url)

const child = process.argv[2]
if (child) {
  const fn = await loadOne(child)
  const html = readFileSync(fixture, 'utf8')
  globalThis.gc()
  const beforeHeap = process.memoryUsage().heapUsed
  let out
  for (let i = 0; i < RUNS; i++) {
    out = fn(html)
  }
  const peakRss = process.memoryUsage().rss
  globalThis.gc()
  const retainedHeap = process.memoryUsage().heapUsed - beforeHeap
  process.stdout.write(JSON.stringify({peakRss, retainedHeap}))
  if (!out) process.exitCode = 1 // keep `out` live so the result is retained
} else {
  const rows = []
  for (const name of NAMES) {
    const run = spawnSync(process.execPath, ['--expose-gc', selfPath, name], {encoding: 'utf8'})
    if (run.status !== 0) {
      rows.push({name, error: (run.stderr || 'failed').trim().split('\n').pop()})
      continue
    }
    rows.push({name, ...JSON.parse(run.stdout)})
  }

  rows.sort((a, b) => (a.peakRss ?? Infinity) - (b.peakRss ?? Infinity))
  console.log(`memory to load the library and extract tags (${RUNS} runs, own process, --expose-gc):`)
  const smallest = rows.find(r => r.peakRss != null)?.peakRss
  for (const r of rows) {
    if (r.error) {
      console.log(`  ${r.name.padEnd(18)} error: ${r.error}`)
      continue
    }
    const rss = (r.peakRss / 1024 / 1024).toFixed(1)
    const heap = (r.retainedHeap / 1024 / 1024).toFixed(1)
    const factor = smallest ? (r.peakRss / smallest).toFixed(1) : '1.0'
    console.log(`  ${r.name.padEnd(18)} ${rss.padStart(6)} MB peak rss  (${heap} MB retained heap, ${factor}x the lightest)`)
  }
}
