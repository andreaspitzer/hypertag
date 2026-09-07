// Speed: ops/sec for the same "extract every meta and link tag" task, on a real
// fixed page (no network, reproducible offline).
import {readFileSync} from 'node:fs'
import Benchmark from 'benchmark'
import {loadParsers} from './parsers.mjs'

const html = readFileSync(new URL('../test/fixture-twitter.html', import.meta.url), 'utf8')
const parsers = await loadParsers()

// Correctness gate: the benchmark is only fair if every library extracts a
// comparable set of tags. Print the counts so the comparison is auditable.
console.log('tags extracted (meta + link), for auditing that the task is equal:')
for (const [name, fn] of Object.entries(parsers)) {
  console.log(`  ${name.padEnd(18)} ${fn(html).length}`)
}
console.log()

const suite = new Benchmark.Suite()
for (const [name, fn] of Object.entries(parsers)) {
  suite.add(name, () => fn(html))
}

suite
  .on('cycle', event => console.log(String(event.target)))
  .on('complete', function () {
    const ranked = Array.prototype.slice.call(this).sort((a, b) => b.hz - a.hz)
    const top = ranked[0].hz
    console.log('\nranked by ops/sec:')
    for (const bench of ranked) {
      const rel = (bench.hz / ranked[ranked.length - 1].hz).toFixed(1)
      console.log(`  ${bench.name.padEnd(18)} ${Math.round(bench.hz).toLocaleString().padStart(12)} ops/sec  (${(top / bench.hz).toFixed(1)}x behind top, ${rel}x over slowest)`)
    }
    console.log(`\nfastest: ${this.filter('fastest').map('name').join(', ')}`)
  })
  .run()
