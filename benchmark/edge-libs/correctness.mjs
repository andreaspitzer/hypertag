// Correctness bench: does the extractor return the RIGHT value on messy-but-valid real-world
// markup? Each case has a known-correct answer. We score what each library actually returns -
// no resolution or decoding applied on its behalf - so this measures the library's own
// correctness, not ours. hypertag/meta vs openlink (its internal parse+extract, since its
// public API fetches) vs open-graph-scraper-lite (cheerio baseline).
import metadata from 'hypertag/meta'
import {parse as olParse} from './node_modules/openlink/src/parse.js'
import {extract as olExtract} from './node_modules/openlink/src/extract.js'
import * as ogsMod from 'open-graph-scraper-lite'

const ogs = ogsMod.default ?? ogsMod
const BASE = 'https://ex.com/page'
const firstUrl = list => (Array.isArray(list) && list[0] ? list[0].url : null)

// [name, html, {field: expectedCorrectValue}]
const CASES = [
  ['numeric entity in title', '<meta property="og:title" content="It&#8217;s &amp; more">', {title: 'It’s & more'}],
  ['accented entities', '<meta property="og:title" content="Caf&eacute; Ma&ntilde;ana">', {title: 'Café Mañana'}],
  ['attributes in unusual order', '<meta content="Ordered" property="og:title" data-x="1">', {title: 'Ordered'}],
  ['og written as name= (MDN style)', '<meta name="og:title" content="ByName">', {title: 'ByName'}],
  ['relative image resolved', '<meta property="og:image" content="/img/x.png">', {image: 'https://ex.com/img/x.png'}],
  ['protocol-relative image', '<meta property="og:image" content="//cdn.ex.com/x.png">', {image: 'https://cdn.ex.com/x.png'}],
  ['tracking params stripped', '<meta property="og:image" content="https://ex.com/x.png?utm_source=a&keep=1">', {image: 'https://ex.com/x.png?keep=1'}],
  ['relative og:url resolved', '<meta property="og:url" content="/article/1">', {url: 'https://ex.com/article/1'}],
  ['JSON-LD-only title', '<script type="application/ld+json">{"headline":"LDTitle"}</script>', {title: 'LDTitle'}],
  ['single-quoted attributes', "<meta property='og:title' content='Quoted'>", {title: 'Quoted'}],
  ['uppercase property name', '<meta property="OG:TITLE" content="Upper">', {title: 'Upper'}],
  ['entity in <title> text', '<title>Plain &amp; Simple</title>', {title: 'Plain & Simple'}]
]

const runners = {
  'hypertag/meta': html => metadata(html, BASE),
  openlink: html => olExtract(olParse(html), BASE),
  'og-scraper-lite': async html => {
    const {result} = await ogs({html})
    return {
      title: result.ogTitle ?? result.twitterTitle ?? null,
      image: firstUrl(result.ogImage) ?? null,
      url: result.ogUrl ?? null
    }
  }
}

const names = Object.keys(runners)
const score = Object.fromEntries(names.map(n => [n, 0]))
const rows = []

for (const [name, html, expect] of CASES) {
  const cells = {}
  for (const lib of names) {
    let got
    try {
      got = await runners[lib](html)
    } catch (e) {
      got = {__error: String(e?.message || e)}
    }
    const ok = Object.entries(expect).every(([f, v]) => got[f] === v)
    if (ok) score[lib]++
    const field = Object.keys(expect)[0]
    cells[lib] = {ok, value: got.__error ? `⚠ ${got.__error}` : got[field]}
  }
  rows.push({name, field: Object.keys(expect)[0], expect: Object.values(expect)[0], cells})
}

console.log('correctness on messy-but-valid markup (✓ = returns the known-correct value)\n')
for (const r of rows) {
  console.log(`• ${r.name}  (expect ${r.field} = ${JSON.stringify(r.expect)})`)
  for (const lib of names) {
    const c = r.cells[lib]
    console.log(`    ${c.ok ? '✓' : '✗'} ${lib.padEnd(16)} ${JSON.stringify(c.value)}`)
  }
}
console.log('\nscore (of ' + CASES.length + '):')
for (const lib of names) console.log(`  ${lib.padEnd(18)} ${score[lib]}/${CASES.length}`)
