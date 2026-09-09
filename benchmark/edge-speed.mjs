// Edge-runtime extraction speed (informational): how fast hypertag's extractor - the
// `metadata(html, url)` path the deployed edge endpoints actually run - executes on the ACTUAL
// edge JS runtimes, measured locally where timers work.
//
// Why local. On a DEPLOYED Cloudflare Worker (and Vercel Edge), `Date.now()`/`performance.now()`
// return the time of the last I/O and do NOT advance during code execution (a Spectre
// mitigation - see https://developers.cloudflare.com/workers/reference/security-model/). So a
// worker cannot time its own CPU-bound work in production. But Cloudflare's docs also note that
// LOCAL workerd increments timers regardless of I/O, so we run the extractor:
//   * on real workerd via Miniflare (the same runtime that runs on Cloudflare's edge), and
//   * in Vercel's edge runtime via @edge-runtime/vm (EdgeVM),
// each self-timing the loop, plus a plain Node baseline for reference. Deployed, over-the-wire
// numbers are the separate `edge-speed-deploy.mjs` differential harness (approach B).
//
// Caveat (honest): EdgeVM gives the edge GLOBALS but runs on the host process's V8, so its
// engine figure tracks Node - the genuinely-different-engine number is workerd. Numbers are
// informational (order-of-magnitude); this is not a gate. Run with `npm run bench:edge-speed`.
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {EdgeVM} from '@edge-runtime/vm'
import {Miniflare} from 'miniflare'
import {metadata} from '../meta.js'

const N = Number(process.env.EDGE_SPEED_N) || 8000
const WARM = Math.min(2000, N)
const BATCHES = 5
const BASE = 'https://ex.com/'
const html = readFileSync(new URL('../test/fixture-twitter.html', import.meta.url), 'utf8')
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const median = xs => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Sanity: the extractor returns a real card on this fixture (so we're timing real work).
const sampleFields = Object.values(metadata(html, BASE)).filter(v => v != null).length

// --- Node baseline (this process; timers advance normally) ---------------------------------
function runNode() {
  for (let i = 0; i < WARM; i++) metadata(html, BASE)
  const batches = []
  for (let b = 0; b < BATCHES; b++) {
    let sink
    const t0 = performance.now()
    for (let i = 0; i < N; i++) sink = metadata(html, BASE)
    const t1 = performance.now()
    if (!sink) throw new Error('no result')
    batches.push(N / ((t1 - t0) / 1000))
  }
  return {opsPerSec: median(batches)}
}

// --- workerd via Miniflare (real Cloudflare runtime, timers advance locally) ----------------
async function runWorkerd() {
  // Bundle a self-timing worker that imports the REAL extractor + inlines the fixture, so the
  // loop runs entirely inside workerd with no I/O.
  const workerSource = `
    import {metadata} from './meta.js'
    const HTML = ${JSON.stringify(html)}
    export default {
      async fetch(request) {
        const n = Number(new URL(request.url).searchParams.get('n')) || ${N}
        const warm = Math.min(${WARM}, n)
        for (let i = 0; i < warm; i++) metadata(HTML, ${JSON.stringify(BASE)})
        let sink
        const t0 = performance.now()
        for (let i = 0; i < n; i++) sink = metadata(HTML, ${JSON.stringify(BASE)})
        const t1 = performance.now()
        return Response.json({ms: t1 - t0, opsPerSec: n / ((t1 - t0) / 1000), fields: sink ? Object.values(sink).filter(v => v != null).length : 0})
      }
    }`
  const bundled = await build({
    stdin: {contents: workerSource, resolveDir: repoRoot, loader: 'js'},
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent'
  })
  const mf = new Miniflare({
    modules: true,
    script: bundled.outputFiles[0].text,
    compatibilityDate: '2025-06-01',
    log: undefined
  })
  try {
    const batches = []
    for (let b = 0; b < BATCHES; b++) {
      const res = await mf.dispatchFetch(`http://localhost/?n=${N}`)
      const j = await res.json()
      if (!j.fields) throw new Error('worker returned an empty card')
      batches.push(j.opsPerSec)
    }
    return {opsPerSec: median(batches)}
  } finally {
    await mf.dispose()
  }
}

// --- Vercel edge runtime via EdgeVM (edge globals; host-process V8) --------------------------
function runEdgeRuntime() {
  const vm = new EdgeVM({
    extend: context => {
      context.__metadata = metadata
      context.__HTML = html
      context.__BASE = BASE
      return context
    }
  })
  const code = n => `(() => {
    for (let i = 0; i < ${WARM}; i++) __metadata(__HTML, __BASE)
    let sink
    const t0 = performance.now()
    for (let i = 0; i < ${n}; i++) sink = __metadata(__HTML, __BASE)
    const t1 = performance.now()
    return {opsPerSec: ${n} / ((t1 - t0) / 1000), fields: sink ? Object.values(sink).filter(v => v != null).length : 0}
  })()`
  const batches = []
  for (let b = 0; b < BATCHES; b++) {
    const r = vm.evaluate(code(N))
    if (!r.fields) throw new Error('EdgeVM returned an empty card')
    batches.push(r.opsPerSec)
  }
  return {opsPerSec: median(batches)}
}

// --- run all, tolerate a runtime failing -----------------------------------------------------
const runtimes = [
  ['Node (baseline)', runNode],
  ['workerd (Cloudflare, Miniflare)', runWorkerd],
  ['edge-runtime (Vercel, EdgeVM)', runEdgeRuntime]
]

console.log(
  `hypertag extractor speed on edge runtimes - metadata() over a fixed ${(html.length / 1024).toFixed(0)} kB page,\n` +
    `${N.toLocaleString()} iterations x ${BATCHES} batches (median), ${sampleFields} non-null card fields. Informational, local.\n`
)

const rows = []
for (const [name, fn] of runtimes) {
  try {
    const {opsPerSec} = await fn()
    rows.push({name, opsPerSec})
  } catch (err) {
    rows.push({name, error: String(err?.message ?? err)})
  }
}

const nodeRow = rows.find(r => r.name.startsWith('Node') && r.opsPerSec)
console.log('  runtime                            ops/sec        vs Node')
for (const r of rows) {
  if (r.error) {
    console.log(`  ${r.name.padEnd(34)} could not run: ${r.error}`)
    continue
  }
  const rel = nodeRow ? `${(r.opsPerSec / nodeRow.opsPerSec).toFixed(2)}x` : '-'
  console.log(`  ${r.name.padEnd(34)} ${Math.round(r.opsPerSec).toLocaleString().padStart(12)}   ${rel.padStart(7)}`)
}
console.log(
  '\nnote: EdgeVM runs the edge globals on the host V8, so its engine number tracks Node; workerd\n' +
    'is the genuinely different runtime. Deployed over-the-wire numbers are a separate harness\n' +
    '(approach B), since a deployed edge function cannot time its own CPU (frozen clock).'
)
