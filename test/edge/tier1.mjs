// Tier-1 edge smoke: import + parse, NO network (contract in ticket 01).
//
// Shared, runtime-agnostic module. Every per-runtime runner (Node, Bun, Deno,
// and later Workers/Vercel) imports this and calls `runTier1()`. It loads
// hypertag by its BARE specifier + subpaths, so it only means something against
// an INSTALLED package (the packed tarball, ticket 03) - relative source paths
// would not exercise the `exports` map.
//
// It mirrors the export-shape contract that `scripts/smoke.js` checks, then runs
// pure string-in functions plus a STUBBED `fromUrl` (injected fake `fetch`), so
// no real network is touched. Uses the plain throwing asserts from `./assert.mjs`
// (never `node:assert`, so it also runs on Workers/Vercel later).

import * as bag from 'hypertag'
import parse, {extend, parseAttrs, stripComments} from 'hypertag/parse'
import ld, {asName, asUrl} from 'hypertag/ld'
import metadata, {favicon} from 'hypertag/meta'
import fromUrl from 'hypertag/fetch'
import oembedEndpoint from 'hypertag/oembed'
import select from 'hypertag/select'
import sanitize, {cleanUrl, decode} from 'hypertag/sanitize'
import {deepEqual, equal, ok} from './assert.mjs'

export async function runTier1() {
  // ---- hypertag/parse: the core entry (default is the callable parse) ----
  equal(typeof parse, 'function', 'hypertag/parse default must be the parse function')
  for (const [name, fn] of Object.entries({parseAttrs, stripComments, extend})) {
    equal(typeof fn, 'function', `hypertag/parse missing named export: ${name}`)
  }
  deepEqual(
    parse('<meta name="x" content="y">', 'meta'),
    [{$tag: 'meta', name: 'x', content: 'y'}],
    'parse() smoke result mismatch'
  )
  equal(stripComments('a<!--b-->c'), 'ac', 'stripComments() smoke mismatch')
  deepEqual(
    parse('<title>Hi</title>', 'title', {content: true}),
    [{$tag: 'title', $content: 'Hi'}],
    'parse() content option smoke mismatch'
  )

  // ---- the other granular subpaths load with their expected shapes --------
  equal(typeof select, 'function', 'hypertag/select default must be the select function')
  equal(typeof sanitize, 'function', 'hypertag/sanitize default must be the sanitize function')
  for (const [name, fn] of Object.entries({decode, cleanUrl})) {
    equal(typeof fn, 'function', `hypertag/sanitize missing named export: ${name}`)
  }
  equal(typeof ld, 'function', 'hypertag/ld default must be the ld function')
  for (const [name, fn] of Object.entries({asName, asUrl})) {
    equal(typeof fn, 'function', `hypertag/ld missing named export: ${name}`)
  }

  // ---- a granular subpath: hypertag/meta ---------------------------------
  const metaMod = await import('hypertag/meta')
  equal(typeof metaMod.default, 'function', 'hypertag/meta default must be the metadata function')
  for (const name of [
    'metadata',
    'extract',
    'meta',
    'link',
    'content',
    'ld',
    'ldName',
    'ldUrl',
    'favicon',
    'favicons'
  ]) {
    equal(typeof metaMod[name], 'function', `hypertag/meta missing named export: ${name}`)
  }
  equal(
    metadata('<meta property="og:title" content="Hi &amp; Bye">').title,
    'Hi & Bye',
    'metadata() smoke result mismatch'
  )
  equal(
    favicon('<link rel="apple-touch-icon" href="/a.png">', 'https://ex.com/'),
    'https://ex.com/a.png',
    'favicon() smoke mismatch'
  )

  // ---- hypertag/fetch + hypertag/oembed load -----------------------------
  equal(typeof fromUrl, 'function', 'hypertag/fetch default must be the fromUrl function')
  equal(typeof oembedEndpoint, 'function', 'hypertag/oembed default must be oembedEndpoint')

  // ---- the batteries-included barrel: hypertag ---------------------------
  // The barrel is named-only (no default export).
  equal(bag.default, undefined, 'the barrel must have no default export')
  for (const name of [
    'parse',
    'parseAttrs',
    'stripComments',
    'extend',
    'select',
    'sanitize',
    'decode',
    'cleanUrl',
    'ld',
    'asName',
    'asUrl',
    'metadata',
    'extract',
    'rules',
    'favicon',
    'favicons',
    'fromUrl',
    'oembed',
    'oembedEndpoint',
    'providers'
  ]) {
    ok(name in bag, `hypertag barrel missing export: ${name}`)
  }
  // The colliding meta source-helpers and standalone pick/compile must NOT be on the barrel.
  for (const name of ['meta', 'link', 'content', 'attr', 'ldName', 'ldUrl', 'pick', 'compile']) {
    ok(!(name in bag), `hypertag barrel must not export: ${name}`)
  }
  // parse, metadata, fromUrl are importable and callable from the barrel.
  equal(typeof bag.parse, 'function', 'barrel parse must be callable')
  equal(typeof bag.metadata, 'function', 'barrel metadata must be callable')
  equal(typeof bag.fromUrl, 'function', 'barrel fromUrl must be callable')
  equal(
    bag.metadata('<meta property="og:title" content="Hi &amp; Bye">').title,
    'Hi & Bye',
    'barrel metadata() smoke result mismatch'
  )

  // ---- STUBBED fromUrl: proves the fetch layer loads, no real network ----
  const card = await bag.fromUrl('https://ex.com/a', {
    fetch: async u => ({
      url: u,
      text: async () => '<meta property="og:title" content="Hi &amp; Bye">'
    })
  })
  equal(card.title, 'Hi & Bye', 'barrel fromUrl() (stubbed) smoke result mismatch')

  ok(
    bag
      .oembedEndpoint('https://www.tiktok.com/@u/video/1')
      ?.startsWith('https://www.tiktok.com/oembed'),
    'barrel oembedEndpoint() smoke mismatch'
  )

  return {
    tier: 1,
    network: false,
    checks: 'export-shape + parse/stripComments/metadata/favicon + stubbed fromUrl'
  }
}

// Make the file runnable directly under Node / Bun / Deno.
// import.meta.main is set by Bun and Deno; Node needs the argv[1] comparison.
const isMainNode =
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  import.meta.url === `file://${process.argv[1]}`
if (import.meta.main || isMainNode) {
  runTier1()
    .then(summary => {
      console.log(`tier1: OK (${summary.checks})`)
    })
    .catch(err => {
      console.error(`tier1: FAIL ${err?.message ?? err}`)
      if (typeof process !== 'undefined') process.exit(1)
      else throw err
    })
}
