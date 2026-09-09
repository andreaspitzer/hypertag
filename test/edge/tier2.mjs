// Tier-2 edge check: full `fromUrl` over the REAL network (contract in ticket 02).
//
// Where tier-1 stubbed `fetch` to prove the layer merely loads and parses, tier-2
// exercises the ONE runtime-divergent surface: each runtime's NATIVE `fetch`. It
// calls `fromUrl(fixtureUrl)` with no injected fetch, so the global native fetch
// runs, does a genuine cross-origin GET against a controlled fixture we own, and we
// assert EXACT-MATCH on the card fields (positive extraction - never "didn't throw",
// which `fromUrl` never does on a broken page anyway).
//
// Like tier-1 this imports hypertag by its BARE specifier, so it only means
// something against the INSTALLED packed tarball (see run-tier2.mjs). Uses the same
// runtime-agnostic throwing asserts from `./assert.mjs` (never `node:assert`).
//
// The fixture is test/edge/fixture/index.html, published to GitHub Pages at
// FIXTURE_URL below. Its og:* content is fixed, so the EXPECTED card is known.

import fromUrl from 'hypertag/fetch'
import {equal, ok} from './assert.mjs'

// The controlled fixture, live on GitHub Pages (directory root -> site root).
// This is the shared, stable target: tickets 13/14 (Vercel / Cloudflare deploy
// jobs) and 15 (CI matrix) hit this SAME URL. Override it for a local run via the
// EDGE_E2E_FIXTURE_URL env var (e.g. a localhost server serving the fixture file).
export const FIXTURE_URL = 'https://andreaspitzer.github.io/hypertag/'

// The known, exact card the fixture yields. Every value here must mirror the og:*
// content in test/edge/fixture/index.html:
//   - title:       og:title, entity-decoded (&amp; -> &) and winning over <title>
//   - description: og:description
//   - image / url: absolute in the fixture, so they resolve to the Pages URL even
//                  when the page is fetched from a localhost validation server.
export const EXPECTED = Object.freeze({
  title: 'hypertag edge-e2e fixture & card',
  description: 'A controlled, deterministic fixture page for hypertag tier-2 edge tests.',
  image: 'https://andreaspitzer.github.io/hypertag/card.png',
  url: 'https://andreaspitzer.github.io/hypertag/'
})

// Resolve the fixture URL: explicit arg > EDGE_E2E_FIXTURE_URL > the live default.
function resolveUrl(url) {
  if (url) return url
  const env =
    typeof process !== 'undefined' && process.env ? process.env.EDGE_E2E_FIXTURE_URL : undefined
  return env || FIXTURE_URL
}

export async function runTier2({url} = {}) {
  const target = resolveUrl(url)

  // Native fetch: no `options.fetch`, so `fromUrl` uses globalThis.fetch. This is
  // the whole point of tier-2 - the real cross-origin egress path.
  const card = await fromUrl(target)

  ok(card, `fromUrl(${target}) returned no card`)
  equal(card.title, EXPECTED.title, `tier2 title mismatch (from ${target})`)
  equal(card.description, EXPECTED.description, `tier2 description mismatch (from ${target})`)
  equal(card.image, EXPECTED.image, `tier2 image mismatch (from ${target})`)
  equal(card.url, EXPECTED.url, `tier2 url mismatch (from ${target})`)

  return {tier: 2, network: true, url: target, checks: 'native fromUrl exact-match title/description/image/url'}
}

// Make the file runnable directly under Node / Bun / Deno.
// import.meta.main is set by Bun and Deno; Node needs the argv[1] comparison.
const isMainNode =
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  import.meta.url === `file://${process.argv[1]}`
if (import.meta.main || isMainNode) {
  runTier2()
    .then(summary => {
      console.log(`tier2: OK (${summary.checks}) <- ${summary.url}`)
    })
    .catch(err => {
      console.error(`tier2: FAIL ${err?.message ?? err}`)
      if (typeof process !== 'undefined') process.exit(1)
      else throw err
    })
}
