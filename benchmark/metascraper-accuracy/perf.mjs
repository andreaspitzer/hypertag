// Throughput for each scraper in scrapers.mjs over the captured real pages: how many pages
// per second it can turn into the normalized {title, description, ...} object. Complements
// index-offline.mjs (which measures accuracy) with the performance side. Async-aware, since
// metascraper and open-graph-scraper are async. Offline; needs the fixtures in fixtures/.
import {readFileSync} from 'node:fs'
import SCRAPERS from './scrapers.mjs'
import MANIFEST from './fixtures.mjs'

const pages = MANIFEST.map(({slug, url}) => {
  try {
    return {url, html: readFileSync(new URL(`./fixtures/${slug}.html`, import.meta.url), 'utf8')}
  } catch {
    return null
  }
}).filter(Boolean)

if (pages.length === 0) {
  console.error('No fixtures found - see README to capture them.')
  process.exit(1)
}

const totalKb = (pages.reduce((n, p) => n + p.html.length, 0) / 1024).toFixed(0)
console.log(`throughput over ${pages.length} real pages (${totalKb} kB total), node ${process.version}\n`)

let sink = 0
const median = xs => xs.slice().sort((a, b) => a - b)[xs.length >> 1]

// One op = one scraper.run() on one page, cycling through the pages.
async function pagesPerSec(scraper, {warmupMs = 300, sampleMs = 700, samples = 5} = {}) {
  const warmEnd = performance.now() + warmupMs
  let w = 0
  while (performance.now() < warmEnd) {
    sink += await sizeOf(scraper, pages[w++ % pages.length])
  }
  const rates = []
  for (let s = 0; s < samples; s++) {
    let count = 0
    const start = performance.now()
    const end = start + sampleMs
    do {
      sink += await sizeOf(scraper, pages[count % pages.length])
      count++
    } while (performance.now() < end)
    rates.push(count / ((performance.now() - start) / 1000))
  }
  return median(rates)
}

async function sizeOf(scraper, page) {
  try {
    return ((await scraper.run(page.url, page.html))?.title || '').length
  } catch {
    return 0
  }
}

const rates = {}
for (const scraper of SCRAPERS) {
  rates[scraper.name] = await pagesPerSec(scraper)
}
const top = Math.max(...Object.values(rates))

console.log('pages/sec (higher is better):')
for (const [name, hz] of Object.entries(rates)) {
  const rel = hz === top ? 'fastest' : `${(top / hz).toFixed(0)}x slower`
  console.log(`  ${name.padEnd(20)} ${Math.round(hz).toString().padStart(6)}   (${rel})`)
}
console.log(`\n(checksum ${sink})`)
