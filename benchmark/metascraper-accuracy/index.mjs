// Runner, adapted from metascraper/benchmark/index.js. Fetches each URL's HTML once (native
// fetch instead of got), runs every scraper on the same HTML, writes results/<scraper>.json
// for eyeballing, and prints a coverage + agreement summary. Per-URL failures are recorded,
// not fatal, so one dead page or one broken scraper does not abort the whole run.
//
// Requires network access - it fetches the real pages in urls.mjs. This is why it cannot run
// in a sandboxed/offline environment; run it on a machine with open outbound HTTPS.
import {mkdir, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import SCRAPERS, {FIELDS} from './scrapers.mjs'
import URLS from './urls.mjs'

const resultsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'results')

console.log(`fetching ${URLS.length} pages...`)
const htmls = await Promise.all(URLS.map(fetchHtml))

const byScraper = {}
for (const scraper of SCRAPERS) {
  const rows = []
  for (let i = 0; i < URLS.length; i++) {
    if (htmls[i] == null) {
      rows.push({__error: 'fetch failed'})
      continue
    }
    try {
      rows.push(await scraper.run(URLS[i], htmls[i]))
    } catch (err) {
      rows.push({__error: String(err?.message || err)})
    }
  }
  byScraper[scraper.name] = rows
}

await rm(resultsDir, {recursive: true, force: true})
await mkdir(resultsDir, {recursive: true})
for (const [name, rows] of Object.entries(byScraper)) {
  await writeFile(path.join(resultsDir, `${name}.json`), JSON.stringify(rows, null, 2))
}

const filled = v => v != null && v !== ''
const max = URLS.length * FIELDS.length

console.log(`\nresults written to results/<scraper>.json (${URLS.length} pages, ${FIELDS.length} fields each)\n`)

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

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {'user-agent': 'Mozilla/5.0 (compatible; metascraper-accuracy-bench)'}
    })
    if (!res.ok) {
      console.warn(`  ${url} -> HTTP ${res.status}`)
      return null
    }
    return await res.text()
  } catch (err) {
    console.warn(`  ${url} -> ${err?.message || err}`)
    return null
  }
}
