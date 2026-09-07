// hypertag vs metascraper on METASCRAPER'S home turf: unified page metadata with fallbacks.
//
// The previous benchmark (og-vs-metascraper.mjs) used the slice hypertag wins - pulling og:
// tags straight out. This one is the fair reverse: resolve {title, description, image, url}
// the way metascraper does, on a MESSY page where every field hides somewhere different:
//   title       -> only in the <title> element's TEXT (no og:/twitter:)
//   description -> only in <meta name="description"> (no og:description)
//   image       -> og:image, but a RELATIVE url that must be resolved to absolute
//   url         -> only in <link rel="canonical"> (no og:url)
//
// To compete, hypertag needs a hand-written rule layer (the fallback order + URL resolution
// below). The honest result: it matches metascraper on the three ATTRIBUTE-sourced fields,
// but CANNOT get `title` - hypertag reads tag attributes, not element text, so <title>Foo</title>
// is structurally out of reach. That gap is exactly what metascraper's weight buys.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const benchDir = path.dirname(fileURLToPath(import.meta.url))
const html = readFileSync(new URL('./fixture-og-fallback.html', import.meta.url), 'utf8')
const PAGE_URL = 'https://example.com/blog/messy-metadata-fallbacks'
const FIELDS = ['title', 'description', 'image', 'url']
let sink = 0
const median = xs => xs.slice().sort((a, b) => a - b)[xs.length >> 1]
const fmt = n => Math.round(n).toLocaleString().padStart(10)

// hypertag's unified rule layer: grab all meta/link tags, then replicate metascraper's
// fallback order and resolve relative URLs by hand. This is the code cost of matching
// metascraper on its own task - and it still cannot reach the <title> text.
async function makeHypertag() {
  const {default: parse} = await import('../hypertag.mjs')
  return () => {
    const metas = parse(html, 'meta')
    const links = parse(html, 'link')
    const prop = v => metas.find(m => (m.property || '').toLowerCase() === v)?.content
    const name = v => metas.find(m => (m.name || '').toLowerCase() === v)?.content
    const rel = v => links.find(l => (l.rel || '').toLowerCase() === v)?.href
    const abs = u => (u == null ? undefined : new URL(u, PAGE_URL).href)
    return {
      title: prop('og:title') ?? name('twitter:title'), // no access to <title> element text
      description: prop('og:description') ?? name('description') ?? name('twitter:description'),
      image: abs(prop('og:image') ?? name('twitter:image')),
      url: prop('og:url') ?? rel('canonical')
    }
  }
}

async function makeMetascraper() {
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

console.log(`task: resolve unified {${FIELDS.join(', ')}} from a messy ${(html.length / 1024).toFixed(0)} kB page (fallbacks + relative-URL resolution)`)
console.log(`node ${process.version}\n`)

const hypertag = await makeHypertag()
const metascraper = await makeMetascraper()
const ht = hypertag()
const ms = await metascraper()

// Coverage: this is the headline. Show what each resolves, and where they agree.
console.log('coverage (does each tool resolve the field, and do they agree?):')
console.log(`  ${'field'.padEnd(12)} ${'metascraper'.padEnd(52)} ${'hypertag'.padEnd(52)} match`)
let matches = 0
for (const f of FIELDS) {
  const same = ht[f] === ms[f]
  if (same) matches++
  const clip = s => (s == null ? '(none)' : String(s)).slice(0, 50)
  console.log(`  ${f.padEnd(12)} ${clip(ms[f]).padEnd(52)} ${clip(ht[f]).padEnd(52)} ${same ? 'yes' : 'NO'}`)
}
console.log(`\n  hypertag matches metascraper on ${matches}/${FIELDS.length} fields.`)
console.log('  The miss is `title`: it lives in the <title> element text, and hypertag reads')
console.log('  attributes, not text - so it is structurally unreachable, not just harder.\n')

await speed()
footprint()
console.log('\ncold start / memory: same libraries as `bench:og`, so unchanged there')
console.log(`(checksum ${sink})`)

async function speed() {
  console.log('speed (ops/sec on the unified task, median of samples):')
  const rates = {}
  for (const [name, task] of Object.entries({hypertag, metascraper})) {
    rates[name] = await opsPerSec(task)
  }
  const top = Math.max(...Object.values(rates))
  for (const [name, hz] of Object.entries(rates)) {
    const rel = hz === top ? 'fastest' : `${(top / hz).toFixed(0)}x slower`
    console.log(`  ${name.padEnd(12)} ${fmt(hz)} ops/sec  (${rel})`)
  }
  console.log()
}

async function opsPerSec(task, {warmupMs = 250, sampleMs = 400, samples = 7} = {}) {
  const warmEnd = performance.now() + warmupMs
  while (performance.now() < warmEnd) {
    sink += ((await task()).description || '').length
  }
  const out = []
  for (let s = 0; s < samples; s++) {
    let count = 0
    const start = performance.now()
    const end = start + sampleMs
    do {
      sink += ((await task()).description || '').length
      count++
    } while (performance.now() < end)
    out.push(count / ((performance.now() - start) / 1000))
  }
  return median(out)
}

// Install footprint (same closure walk as og-vs-metascraper.mjs). hypertag's unified path
// uses only the core parser, still zero dependencies.
function footprint() {
  console.log('install footprint (dependency closure, approximate):')
  const hypertagFiles = ['hypertag.js', 'hypertag.mjs', 'package.json', 'README.md', 'LICENSE', 'index.d.ts', 'index.d.mts']
  let bytes = 0
  for (const f of hypertagFiles) {
    const p = path.join(benchDir, '..', f)
    if (existsSync(p)) bytes += statSync(p).size
  }
  report('hypertag', 1, bytes, '0 deps, core parser only')

  const roots = ['metascraper', 'metascraper-title', 'metascraper-description', 'metascraper-image', 'metascraper-url']
  const dirs = closure(roots, path.join(benchDir, 'node_modules'))
  let msBytes = 0
  for (const dir of dirs.values()) msBytes += ownSize(dir)
  report('metascraper', dirs.size, msBytes, `${roots.length} direct + ${dirs.size - roots.length} transitive`)
}

function report(name, pkgs, bytes, note) {
  const size = bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} kB`
  console.log(`  ${name.padEnd(12)} ${String(pkgs).padStart(4)} packages  ${size.padStart(9)} on disk  (${note})`)
}

function closure(rootNames, benchNodeModules) {
  const seen = new Map()
  const stack = rootNames.map(name => ({name, from: null}))
  while (stack.length) {
    const {name, from} = stack.pop()
    if (seen.has(name)) continue
    const candidates = []
    if (from) candidates.push(path.join(from, 'node_modules', name))
    candidates.push(path.join(benchNodeModules, name))
    const dir = candidates.find(d => existsSync(path.join(d, 'package.json')))
    if (!dir) continue
    seen.set(name, dir)
    const pj = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
    for (const dep of Object.keys(pj.dependencies || {})) stack.push({name: dep, from: dir})
  }
  return seen
}

function ownSize(dir) {
  let bytes = 0
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === 'node_modules') continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) bytes += ownSize(p)
    else if (entry.isFile()) bytes += statSync(p).size
  }
  return bytes
}
