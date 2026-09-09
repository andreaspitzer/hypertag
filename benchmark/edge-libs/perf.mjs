// Speed (and a light memory sanity check) for the extraction field: hypertag/meta vs openlink
// vs open-graph-scraper-lite.
//
// openlink's public API `preview(url)` fetches, so we time its internal parse + extract - the
// same extraction work, minus the network - which if anything flatters openlink. Both hypertag
// and openlink are treeless regex scanners, so between those two memory is a wash;
// open-graph-scraper-lite builds a cheerio tree per call (async API), so it is timed in a
// separate async loop and is far slower. The size/memory drama is only against DOM builders
// (jsdom/cheerio), covered in the main benchmark.
//
// Absolute numbers on a shared CI/container are NOT representative - the ratio is the point.
// Runs fully offline against the saved fixtures. Usage: `node perf.mjs [ms]`.
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import metadata from 'hypertag/meta'
import {parse as olParse} from './node_modules/openlink/src/parse.js'
import {extract as olExtract} from './node_modules/openlink/src/extract.js'
import * as ogsMod from 'open-graph-scraper-lite'
import FIXTURES from '../metascraper-accuracy/fixtures.mjs'

const ogs = ogsMod.default ?? ogsMod

const ms = Number(process.argv[2]) || 2000
const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(here, '..', 'metascraper-accuracy', 'fixtures')

const pages = []
for (const {slug, url} of FIXTURES) {
  try {
    pages.push({url, html: await readFile(path.join(dir, `${slug}.html`), 'utf8')})
  } catch {}
}
const kb = (pages.reduce((n, p) => n + p.html.length, 0) / 1024).toFixed(0)
console.log(`${pages.length} saved pages, ${kb} kB total  (ratios, not absolutes - container-relative)\n`)

// Sync contenders (both treeless regex scanners) and one async contender
// (open-graph-scraper-lite builds a cheerio tree and its API is promise-based).
const contenders = {
  'hypertag/meta': (html, url) => metadata(html, url),
  'openlink (parse+extract)': (html, url) => olExtract(olParse(html), url)
}
const asyncContenders = {
  'og-scraper-lite (cheerio)': (html) => ogs({html})
}

function opsPerSec(fn) {
  for (let i = 0; i < 50; i++) for (const p of pages) fn(p.html, p.url) // warmup
  let ops = 0
  const t0 = performance.now()
  while (performance.now() - t0 < ms) {
    for (const p of pages) {
      fn(p.html, p.url)
      ops++
    }
  }
  return ops / ((performance.now() - t0) / 1000)
}

async function opsPerSecAsync(fn) {
  for (let i = 0; i < 50; i++) for (const p of pages) await fn(p.html, p.url) // warmup
  let ops = 0
  const t0 = performance.now()
  while (performance.now() - t0 < ms) {
    for (const p of pages) {
      await fn(p.html, p.url)
      ops++
    }
  }
  return ops / ((performance.now() - t0) / 1000)
}

const speed = {}
for (const [name, fn] of Object.entries(contenders)) speed[name] = opsPerSec(fn)
for (const [name, fn] of Object.entries(asyncContenders)) speed[name] = await opsPerSecAsync(fn)
const best = Math.max(...Object.values(speed))

console.log('page-extractions/sec (higher is better):')
for (const [name, ops] of Object.entries(speed)) {
  console.log(`  ${name.padEnd(26)} ${Math.round(ops).toString().padStart(6)} ops/s  (${(ops / best).toFixed(2)}x)`)
}

// Retained-memory sanity check. Needs real GC to be meaningful - without --expose-gc the
// delta is just uncollected transient garbage (hypertag allocates more per call because it
// does more work: attribute objects, JSON-LD, decoded strings), not memory that is held.
// Both are treeless, so once GC runs neither retains a tree - the honest expectation is a wash.
if (typeof globalThis.gc !== 'function') {
  console.log('\nretained memory: run `node --expose-gc perf.mjs` for a meaningful number')
} else {
  console.log('\nretained memory after 200 passes, GC forced (both treeless - expect a wash):')
  for (const [name, fn] of Object.entries(contenders)) {
    globalThis.gc()
    const before = process.memoryUsage().heapUsed
    let sink
    for (let i = 0; i < 200; i++) for (const p of pages) sink = fn(p.html, p.url)
    void sink
    globalThis.gc()
    const delta = (process.memoryUsage().heapUsed - before) / 1024 / 1024
    console.log(`  ${name.padEnd(26)} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} MB`)
  }
}
