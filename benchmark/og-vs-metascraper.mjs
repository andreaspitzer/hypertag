// hypertag + select vs metascraper, on ONE identical task: pull a page's OpenGraph
// fields {title, description, image, url} out of a fixed local HTML string (no network).
//
// The two are not the same kind of tool. metascraper returns cooked, unified values after
// running priority rules across OG / Twitter / JSON-LD / HTML with URL normalization;
// hypertag returns raw tags and we map og:X -> X ourselves. So this measures only the
// narrow OG-extraction slice both can do, and the fixture is authored (clean, absolute
// URLs) so both resolve to the identical object. metascraper is doing more work by design.
//
// Four dimensions, mirroring speed.mjs / memory.mjs: speed, cold-start, memory, footprint.
// The file re-invokes itself as a child for the process-isolated sections (as memory.mjs does).
import {spawnSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const selfPath = fileURLToPath(import.meta.url)
const benchDir = path.dirname(selfPath)
const html = readFileSync(new URL('./fixture-og.html', import.meta.url), 'utf8')
const PAGE_URL = 'https://example.com/blog/zero-dependency-html-parsing'
const FIELDS = ['title', 'description', 'image', 'url']

// Each contender is a factory that imports its library and returns an async task
// `() => {title, description, image, url}`. Imports are dynamic and inside the factory so a
// child process measuring one contender never loads the other.
const contenders = {
  hypertag: async () => {
    const {default: select} = await import('../select.mjs')
    return () => {
      const tags = select(html, 'meta[property^=og:]')
      const m = Object.fromEntries(tags.map(t => [t.property, t.content]))
      return {title: m['og:title'], description: m['og:description'], image: m['og:image'], url: m['og:url']}
    }
  },
  metascraper: async () => {
    const [factory, title, description, image, url] = await Promise.all([
      import('metascraper'),
      import('metascraper-title'),
      import('metascraper-description'),
      import('metascraper-image'),
      import('metascraper-url')
    ])
    const metascraper = factory.default([title.default(), description.default(), image.default(), url.default()])
    return async () => {
      const r = await metascraper({html, url: PAGE_URL})
      return {title: r.title, description: r.description, image: r.image, url: r.url}
    }
  }
}

const MEMORY_RUNS = 25
const COLD_RUNS = 7
let sink = 0
const median = xs => xs.slice().sort((a, b) => a - b)[xs.length >> 1]
const fmt = n => Math.round(n).toLocaleString().padStart(10)

const mode = process.argv[2]
if (mode?.startsWith('memory:')) {
  await memoryChild(mode.slice('memory:'.length))
} else if (mode?.startsWith('coldstart:')) {
  await coldStartChild(mode.slice('coldstart:'.length))
} else {
  await main()
}

// --- child: memory (peak RSS + retained heap after N runs, own --expose-gc process) ---
async function memoryChild(name) {
  const task = await contenders[name]()
  globalThis.gc?.()
  const beforeHeap = process.memoryUsage().heapUsed
  let out
  for (let i = 0; i < MEMORY_RUNS; i++) {
    out = await task()
  }
  const peakRss = process.memoryUsage().rss
  globalThis.gc?.()
  const retainedHeap = process.memoryUsage().heapUsed - beforeHeap
  process.stdout.write(JSON.stringify({peakRss, retainedHeap}))
  if (!out) process.exitCode = 1 // keep `out` live so the result is retained
}

// --- child: cold start (import + build + first run, from a fresh process) ---
async function coldStartChild(name) {
  const t0 = performance.now()
  const task = await contenders[name]()
  await task() // include first-call warmup: cold time to first result
  process.stdout.write(String(performance.now() - t0))
}

async function main() {
  console.log(`task: extract OpenGraph {${FIELDS.join(', ')}} from a ${(html.length / 1024).toFixed(0)} kB page`)
  console.log(`node ${process.version}\n`)

  // Correctness gate: both must return the identical object (field by field, order-agnostic)
  // before any number is reported.
  const ht = await (await contenders.hypertag())()
  const ms = await (await contenders.metascraper())()
  for (const f of FIELDS) {
    if (ht[f] !== ms[f]) {
      throw new Error(`correctness gate failed on "${f}":\n  hypertag:    ${ht[f]}\n  metascraper: ${ms[f]}`)
    }
  }
  console.log('correctness gate passed - both return:')
  for (const f of FIELDS) console.log(`  ${f.padEnd(11)} ${ht[f]}`)
  console.log()

  await speed()
  coldStart()
  memory()
  footprint()

  console.log(`\n(checksum ${sink})`)
}

// --- speed: ops/sec on the OG task (async loop; hypertag is sync but awaits fine) ---
async function speed() {
  console.log('speed (ops/sec, median of samples):')
  const base = {}
  for (const [name, make] of Object.entries(contenders)) {
    const task = await make()
    base[name] = await opsPerSec(task)
  }
  const top = Math.max(...Object.values(base))
  for (const [name, hz] of Object.entries(base)) {
    const rel = hz === top ? 'fastest' : `${(top / hz).toFixed(0)}x slower`
    console.log(`  ${name.padEnd(12)} ${fmt(hz)} ops/sec  (${rel})`)
  }
  console.log()
}

async function opsPerSec(task, {warmupMs = 250, sampleMs = 400, samples = 7} = {}) {
  const warmEnd = performance.now() + warmupMs
  while (performance.now() < warmEnd) {
    sink += (await task()).title.length
  }
  const rates = []
  for (let s = 0; s < samples; s++) {
    let count = 0
    const start = performance.now()
    const end = start + sampleMs
    do {
      sink += (await task()).title.length
      count++
    } while (performance.now() < end)
    rates.push(count / ((performance.now() - start) / 1000))
  }
  return median(rates)
}

// --- cold start: median library load + init + first result, one fresh process per run ---
function coldStart() {
  console.log(`cold start (library load + init + first result, ${COLD_RUNS} fresh processes, median):`)
  for (const name of Object.keys(contenders)) {
    const times = []
    for (let k = 0; k < COLD_RUNS; k++) {
      const run = spawnSync(process.execPath, [selfPath, `coldstart:${name}`], {encoding: 'utf8'})
      if (run.status !== 0) {
        console.log(`  ${name.padEnd(12)} error: ${(run.stderr || 'failed').trim().split('\n').pop()}`)
        times.length = 0
        break
      }
      times.push(Number(run.stdout))
    }
    if (times.length) console.log(`  ${name.padEnd(12)} ${median(times).toFixed(1).padStart(8)} ms`)
  }
  console.log()
}

// --- memory: peak RSS + retained heap, one --expose-gc process per contender ---
function memory() {
  console.log(`memory (load library + ${MEMORY_RUNS} runs, own --expose-gc process):`)
  for (const name of Object.keys(contenders)) {
    const run = spawnSync(process.execPath, ['--expose-gc', selfPath, `memory:${name}`], {encoding: 'utf8'})
    if (run.status !== 0) {
      console.log(`  ${name.padEnd(12)} error: ${(run.stderr || 'failed').trim().split('\n').pop()}`)
      continue
    }
    const {peakRss, retainedHeap} = JSON.parse(run.stdout)
    const rss = (peakRss / 1024 / 1024).toFixed(1)
    const heap = (retainedHeap / 1024 / 1024).toFixed(1)
    console.log(`  ${name.padEnd(12)} ${rss.padStart(6)} MB peak rss  (${heap} MB retained heap)`)
  }
  console.log()
}

// --- footprint: transitive dependency count + on-disk size of the install closure ---
// Walks package.json `dependencies` from the installed node_modules (offline, no double
// counting: each package dir is summed once, excluding nested node_modules). Approximate
// (ignores npm hoist-dedup subtleties) but directionally honest.
function footprint() {
  console.log('install footprint (dependency closure, approximate):')

  // hypertag ships as its own files with zero dependencies.
  const hypertagFiles = [
    'hypertag.js', 'hypertag.mjs', 'select.js', 'select.mjs',
    'index.d.ts', 'index.d.mts', 'select.d.ts', 'select.d.mts',
    'package.json', 'README.md', 'LICENSE'
  ]
  let hypertagBytes = 0
  for (const f of hypertagFiles) {
    const p = path.join(benchDir, '..', f)
    if (existsSync(p)) hypertagBytes += statSync(p).size
  }
  report('hypertag', 1, hypertagBytes, '0 deps')

  const roots = ['metascraper', 'metascraper-title', 'metascraper-description', 'metascraper-image', 'metascraper-url']
  const dirs = closure(roots)
  let bytes = 0
  for (const dir of dirs.values()) bytes += ownSize(dir)
  report('metascraper', dirs.size, bytes, `${roots.length} direct + ${dirs.size - roots.length} transitive`)
}

function report(name, pkgs, bytes, note) {
  const size = bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} kB`
  console.log(`  ${name.padEnd(12)} ${String(pkgs).padStart(4)} packages  ${size.padStart(9)} on disk  (${note})`)
}

function closure(rootNames) {
  const benchNodeModules = path.join(benchDir, 'node_modules')
  const seen = new Map()
  const stack = rootNames.map(name => ({name, from: null}))
  while (stack.length) {
    const {name, from} = stack.pop()
    if (seen.has(name)) continue
    const dir = pkgDir(name, from, benchNodeModules)
    if (!dir) continue
    seen.set(name, dir)
    const pj = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
    for (const dep of Object.keys(pj.dependencies || {})) {
      stack.push({name: dep, from: dir})
    }
  }
  return seen
}

function pkgDir(name, from, benchNodeModules) {
  const candidates = []
  if (from) candidates.push(path.join(from, 'node_modules', name))
  candidates.push(path.join(benchNodeModules, name))
  return candidates.find(dir => existsSync(path.join(dir, 'package.json')))
}

function ownSize(dir) {
  let bytes = 0
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === 'node_modules') continue // counted separately as its own package
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) bytes += ownSize(p)
    else if (entry.isFile()) bytes += statSync(p).size
  }
  return bytes
}
