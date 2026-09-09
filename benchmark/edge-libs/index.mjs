// Extraction parity + footprint summary for the edge link-preview field.
//
// The apples-to-apples task: from HTML you already have, produce {title, description, image,
// url}. Only two contenders take HTML in hand - hypertag/meta and open-graph-scraper-lite - so
// the field comparison is between those two. linkpeek and openlink fetch the URL themselves
// (fetch + extract, a category up), so they are reported for ship size only, not field parity.
//
// Runs fully offline against the saved fixtures in ../metascraper-accuracy/fixtures.
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import metadata from 'hypertag/meta'
import * as ogsMod from 'open-graph-scraper-lite'
import FIXTURES from '../metascraper-accuracy/fixtures.mjs'

const ogs = ogsMod.default ?? ogsMod
const here = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(here, '..', 'metascraper-accuracy', 'fixtures')
const FIELDS = ['title', 'description', 'image', 'url']

const firstUrl = list => (Array.isArray(list) && list[0] ? list[0].url : null)

async function load(slug) {
  try {
    return await readFile(path.join(fixturesDir, `${slug}.html`), 'utf8')
  } catch {
    return null
  }
}

const runners = {
  'hypertag/meta': (html, url) => {
    const m = metadata(html, url)
    return {title: m.title, description: m.description, image: m.image, url: m.url}
  },
  'open-graph-scraper-lite': async (html, url) => {
    const {result} = await ogs({html})
    return {
      title: result.ogTitle ?? result.twitterTitle ?? null,
      description: result.ogDescription ?? result.twitterDescription ?? null,
      image: firstUrl(result.ogImage) ?? firstUrl(result.twitterImage),
      // og-scraper-lite returns ogUrl as declared; resolve nothing itself. hypertag resolves
      // against the page URL, so normalize og-lite's relative url the same way for a fair match.
      url: absolute(result.ogUrl, url)
    }
  }
}

function absolute(v, base) {
  if (v == null) return null
  try {
    return new URL(v, base).href
  } catch {
    return v
  }
}

const filled = v => v != null && v !== ''
const rows = {}
for (const name of Object.keys(runners)) rows[name] = []

const present = []
for (const {slug, url} of FIXTURES) {
  const html = await load(slug)
  if (html == null) continue
  present.push(slug)
  for (const [name, run] of Object.entries(runners)) {
    try {
      rows[name].push(await run(html, url))
    } catch (err) {
      rows[name].push({__error: String(err?.message || err)})
    }
  }
}

const max = present.length * FIELDS.length
console.log(`\nextraction over ${present.length} saved pages (${FIELDS.join(', ')}):\n`)

console.log(`field coverage (non-empty, max ${max}):`)
for (const [name, list] of Object.entries(rows)) {
  let n = 0
  for (const r of list) if (!r.__error) for (const f of FIELDS) if (filled(r[f])) n++
  console.log(`  ${name.padEnd(24)} ${String(n).padStart(2)}/${max}`)
}

const a = rows['hypertag/meta']
const b = rows['open-graph-scraper-lite']
let agree = 0
let comparable = 0
const diffs = []
present.forEach((slug, i) => {
  for (const f of FIELDS) {
    comparable++
    if (a[i][f] === b[i][f]) agree++
    else diffs.push({slug, f, hypertag: a[i][f], ogLite: b[i][f]})
  }
})
console.log(`\nagreement hypertag/meta vs open-graph-scraper-lite: ${agree}/${comparable} identical`)
if (diffs.length) {
  console.log('\ndifferences:')
  for (const d of diffs) {
    console.log(`  [${d.slug}] ${d.f}`)
    console.log(`      hypertag: ${JSON.stringify(d.hypertag)}`)
    console.log(`      og-lite : ${JSON.stringify(d.ogLite)}`)
  }
}
