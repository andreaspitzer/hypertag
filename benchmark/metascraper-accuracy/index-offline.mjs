// Offline runner: same comparison as index.mjs, but reads saved HTML from fixtures/<slug>.html
// (per fixtures.mjs) instead of fetching over the network. Use this when the pages have been
// captured as fixtures, so the accuracy comparison is reproducible with no network.
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import SCRAPERS, {FIELDS} from './scrapers.mjs'
import MANIFEST from './fixtures.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(here, 'fixtures')
const resultsDir = path.join(here, 'results')

// Load whichever fixtures are present; skip (with a note) the ones not yet captured.
const pages = []
for (const {slug, url} of MANIFEST) {
  const file = path.join(fixturesDir, `${slug}.html`)
  if (!existsSync(file)) {
    console.warn(`  skip ${slug} - fixtures/${slug}.html not found`)
    continue
  }
  pages.push({slug, url, html: readFileSync(file, 'utf8')})
}
if (pages.length === 0) {
  console.error('\nNo fixtures found. Save pages to fixtures/<slug>.html (see README) and retry.')
  process.exit(1)
}
console.log(`\nrunning ${SCRAPERS.length} scrapers over ${pages.length} captured pages...\n`)

const byScraper = {}
for (const scraper of SCRAPERS) {
  const rows = []
  for (const page of pages) {
    try {
      rows.push({slug: page.slug, ...(await scraper.run(page.url, page.html))})
    } catch (err) {
      rows.push({slug: page.slug, __error: String(err?.message || err)})
    }
  }
  byScraper[scraper.name] = rows
}

rmSync(resultsDir, {recursive: true, force: true})
mkdirSync(resultsDir, {recursive: true})
for (const [name, rows] of Object.entries(byScraper)) {
  writeFileSync(path.join(resultsDir, `${name}.json`), JSON.stringify(rows, null, 2))
}

const filled = v => v != null && v !== ''
const max = pages.length * FIELDS.length

console.log(`results written to results/<scraper>.json (${pages.length} pages, ${FIELDS.length} fields each)\n`)

console.log(`field coverage (non-empty fields, max ${max}):`)
for (const [name, rows] of Object.entries(byScraper)) {
  let count = 0
  for (const row of rows) {
    if (row.__error) continue
    for (const f of FIELDS) if (filled(row[f])) count++
  }
  console.log(`  ${name.padEnd(20)} ${String(count).padStart(3)}/${max}`)
}

console.log('\nagreement with metascraper (identical value on comparable fields):')
const ref = byScraper.metascraper
for (const [name, rows] of Object.entries(byScraper)) {
  if (name === 'metascraper' || !ref) continue
  let agree = 0
  let comparable = 0
  rows.forEach((row, i) => {
    const r = ref[i]
    if (!r || r.__error || row.__error) return
    for (const f of FIELDS) {
      comparable++
      if (row[f] === r[f]) agree++
    }
  })
  console.log(`  ${name.padEnd(20)} ${agree}/${comparable}`)
}
