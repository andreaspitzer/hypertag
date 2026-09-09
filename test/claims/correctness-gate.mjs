// Correctness claim gate (CI): the README claims hypertag returns the RIGHT value on all 12
// messy-but-valid cases ("correct /12" column = 12, and "the only row that gets every messy
// case right"). This gate re-runs those exact 12 cases against the extractor and FAILS
// (non-zero exit) unless it scores 12/12 - so a regression that breaks entity decoding, URL
// resolution, the JSON-LD fallback, `name=` handling, etc. turns CI red.
//
// The cases are the SAME ones benchmark/edge-libs/correctness.mjs scores every library on;
// kept in sync here as the self-contained, dependency-free gate for hypertag's own score (no
// competitor libraries needed). It imports the published SOURCE (../../meta.js) - subpath
// export resolution is covered separately by the edge tier-1 tests. Run with
// `npm run claims:correctness`.
import {metadata} from '../../meta.js'

const BASE = 'https://ex.com/page'

// [name, html, {field: expectedCorrectValue}] - mirrors benchmark/edge-libs/correctness.mjs.
// If you add or change a case here, change it there too (and the README's "/12" if the count
// moves).
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

let passed = 0
const failures = []
for (const [name, html, expect] of CASES) {
  let got
  try {
    got = metadata(html, BASE)
  } catch (err) {
    got = {__error: String(err?.message ?? err)}
  }
  const [field, want] = Object.entries(expect)[0]
  const ok = !got.__error && Object.entries(expect).every(([f, v]) => got[f] === v)
  if (ok) {
    passed++
  } else {
    failures.push({name, field, want, got: got.__error ? `⚠ ${got.__error}` : got[field]})
  }
}

console.log(`correctness claim gate - hypertag/meta on ${CASES.length} messy-but-valid cases:\n`)
for (const [name, , expect] of CASES) {
  const field = Object.keys(expect)[0]
  const bad = failures.find(f => f.name === name)
  console.log(`  ${bad ? '✗' : '✓'} ${name}  (expect ${field} = ${JSON.stringify(Object.values(expect)[0])})`)
  if (bad) console.log(`      got ${JSON.stringify(bad.got)}`)
}

console.log(`\nscore: ${passed}/${CASES.length}`)
if (passed !== CASES.length) {
  console.error(
    `\ncorrectness claim gate FAILED: ${CASES.length - passed} case(s) regressed. The README ` +
      'claims 12/12 - fix the extractor, or if a case is genuinely wrong, correct it here AND ' +
      'in benchmark/edge-libs/correctness.mjs AND reconcile the README.'
  )
  process.exit(1)
}
console.log('\ncorrectness claim gate OK: 12/12, matching the README claim.')
