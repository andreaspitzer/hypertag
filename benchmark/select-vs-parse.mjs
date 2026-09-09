// select vs parse: what does the opt-in selector layer cost over a hand-written
// parse().filter()? Zero-dependency (imports only the package itself), so it runs
// with plain `node select-vs-parse.mjs` — no need to install the comparison harness.
//
// Three equivalent ways to get the same tags, per task:
//   baseline  parse(html, tag).filter(predicate)     the hand-written pattern
//   eager     select(html, selector)                 compiles the selector every call
//   compiled  select.compile(selector) once, reused  compile paid once, then applied
//
// The point of interest is the gap between them: `compiled` should sit right on top of
// baseline (same parse, a generic predicate instead of an inline one), while `eager`
// additionally pays selector compilation on every call.
import {readFileSync} from 'node:fs'
import parse from '../parse.js'
import select from '../select.js'

const html = readFileSync(new URL('../test/fixture-twitter.html', import.meta.url), 'utf8')

// Each task: a selector and the hand-written parse().filter() it compiles to. The two
// must return byte-for-byte the same array — asserted below before timing.
const tasks = [
  {
    name: 'link[rel=alternate]',
    selector: 'link[rel=alternate]',
    baseline: () => parse(html, 'link').filter(({rel}) => rel === 'alternate')
  },
  {
    name: 'meta[property^=og:]',
    selector: 'meta[property^=og:]',
    baseline: () =>
      parse(html, 'meta').filter(({property}) => typeof property === 'string' && property.startsWith('og:'))
  },
  {
    // A comma selector list. It compiles to ONE parse over the union of the groups' tags,
    // then a predicate that keeps an element when any one whole group matches it (that
    // group's tag AND its conditions). The hand-written equivalent is exactly that single
    // union pass - not two separate parse().filter() scans - so `compiled` should again land
    // on baseline, and the list saves the extra document scan two separate selects would cost.
    name: 'link[rel=alternate], meta[property^=og:]  (selector list)',
    selector: 'link[rel=alternate], meta[property^=og:]',
    baseline: () =>
      parse(html, ['link', 'meta']).filter(
        el =>
          (el.$tag === 'link' && el.rel === 'alternate') ||
          (el.$tag === 'meta' && typeof el.property === 'string' && el.property.startsWith('og:'))
      )
  }
]

// A dependency-free timer: warm up, then count how many calls fit in a time budget,
// repeated over several samples. Report the median ops/sec (robust to outliers). `sink`
// accumulates a checksum from every result so the optimizer can't elide the work.
let sink = 0
function opsPerSec(fn, {warmupMs = 250, sampleMs = 400, samples = 7} = {}) {
  const warmEnd = performance.now() + warmupMs
  while (performance.now() < warmEnd) {
    sink += fn().length
  }
  const rates = []
  for (let s = 0; s < samples; s++) {
    let count = 0
    const start = performance.now()
    const end = start + sampleMs
    do {
      sink += fn().length
      count++
    } while (performance.now() < end)
    rates.push(count / ((performance.now() - start) / 1000))
  }
  rates.sort((a, b) => a - b)
  return rates[rates.length >> 1]
}

const fmt = n => Math.round(n).toLocaleString().padStart(12)

console.log(`fixture: ${(html.length / 1024).toFixed(0)} kB (test/fixture-twitter.html)`)
console.log(`node ${process.version}\n`)

for (const task of tasks) {
  const compiled = select.compile(task.selector)
  const variants = {
    baseline: task.baseline,
    eager: () => select(html, task.selector),
    compiled: () => compiled(html)
  }

  // Correctness gate: all three must produce the identical result set.
  const expected = JSON.stringify(task.baseline())
  for (const [name, fn] of Object.entries(variants)) {
    if (JSON.stringify(fn()) !== expected) {
      throw new Error(`variant "${name}" disagrees with baseline for ${task.name}`)
    }
  }

  console.log(`${task.name}  (${task.baseline().length} tag(s) matched)`)
  const base = opsPerSec(variants.baseline)
  for (const [name, fn] of Object.entries(variants)) {
    const hz = opsPerSec(fn)
    const rel = name === 'baseline' ? '' : `  (${(base / hz).toFixed(2)}x vs baseline)`
    console.log(`  ${name.padEnd(9)} ${fmt(hz)} ops/sec${rel}`)
  }
  console.log()
}

// Isolate the selector-compilation cost the eager form pays per call: compiling with no
// parse at all. This is the whole of eager's overhead over compiled.
const compileHz = opsPerSec(() => select.compile('link[rel=alternate]'), {samples: 5})
console.log(`selector compile only (no parse): ${fmt(compileHz)} ops/sec`)

// Print the checksum so the loops above can't be optimized away.
console.log(`\n(checksum ${sink})`)
