// Cloudflare Workers ephemeral deploy-and-assert (tickets 08 + 13).
//
// This is the script ticket 15's CI job invokes (`npm run smoke:edge:cf`). It runs the
// full tier-2 fetch path on a REAL Cloudflare Worker over the network, then always tears
// the worker down. The flow (ticket 08's hybrid model, Cloudflare = ephemeral):
//
//   1. pack the publishable tarball into a throwaway consumer (reuses pack-run.mjs's
//      packConsumer, so the deployed worker bundles the REAL published package, ticket 03),
//   2. lay the shared handler + the Workers shim + wrangler.toml into that consumer and
//      `npm install` the tarball there,
//   3. `wrangler versions upload` under a UNIQUE per-run name -> a `*.workers.dev` preview
//      URL (no promotion over any live route), authed by CLOUDFLARE_API_TOKEN +
//      CLOUDFLARE_ACCOUNT_ID from the env (ticket 09),
//   4. fetch `<previewUrl>?url=<FIXTURE_URL>` and assert the returned card exact-matches
//      tier-2's frozen EXPECTED (positive extraction, reusing assert.mjs + tier2.mjs),
//   5. ALWAYS tear down in a finally: `wrangler delete` (best-effort), with a REST
//      DELETE fallback (ticket 04 flagged the non-interactive delete flag as unconfirmed).
//
// Non-zero exit on any assertion failure. When CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
// are absent (i.e. outside CI - there are no Cloudflare secrets in a dev sandbox) it SKIPS
// cleanly with exit 0, so it never hard-fails locally.

import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdirSync, rmSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deepEqual} from '../assert.mjs'
import {packConsumer} from '../pack-run.mjs'
import {EXPECTED, FIXTURE_URL} from '../tier2.mjs'

const here = dirname(fileURLToPath(import.meta.url))

// The live fixture the deployed worker unfurls (ticket 02). Same URL tier-2 + every
// other deployed provider hit; override for a one-off via EDGE_E2E_FIXTURE_URL.
const target = process.env.EDGE_E2E_FIXTURE_URL || FIXTURE_URL

// wrangler is a dev/CI tool, invoked via npx (never a runtime dependency). Pin the major.
const WRANGLER = ['--yes', 'wrangler@4']

const sleep = ms => new Promise(r => setTimeout(r, ms))

// --- skip cleanly when there are no Cloudflare credentials (outside CI) --------------
const {CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID} = process.env
if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
  console.log(
    'smoke:edge:cf: SKIP - CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set ' +
      '(expected outside CI; the deploy leg needs Cloudflare secrets). Exit 0.'
  )
  process.exit(0)
}

// Unique worker name per run so parallel CI runs never collide and teardown is exact.
// Workers names are lowercase alphanumerics + dashes; keep it short.
const workerName = `hypertag-edge-e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const wrangler = (args, opts = {}) =>
  execFileSync('npx', [...WRANGLER, ...args], {
    cwd: consumer,
    env: {...process.env, NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false'},
    encoding: 'utf8',
    ...opts
  })

// Best-effort REST teardown fallback if the wrangler delete leg fails (ticket 04).
async function restDelete() {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
      {method: 'DELETE', headers: {authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`}}
    )
    console.log(`smoke:edge:cf: REST delete fallback -> HTTP ${res.status}`)
  } catch (err) {
    console.error(`smoke:edge:cf: REST delete fallback failed: ${err?.message ?? err}`)
  }
}

// Fetch the preview URL, retrying while the freshly-uploaded version propagates.
async function fetchCard(url) {
  let lastErr
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res.json()
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    await sleep(3000)
  }
  throw new Error(`preview URL never returned 200 (${lastErr?.message ?? lastErr}): ${url}`)
}

let consumer
try {
  // 1. Pack the tarball into a throwaway consumer (shared step from pack-run.mjs).
  ;({consumer} = packConsumer({label: 'cf'}))

  // 2. Lay the shared handler + Workers shim + wrangler config into the consumer, mirroring
  //    the repo layout so worker.mjs's `import '../handler.mjs'` resolves, then install.
  copyFileSync(join(here, '..', 'handler.mjs'), join(consumer, 'handler.mjs'))
  const cfDir = join(consumer, 'cloudflare')
  mkdirSync(cfDir)
  copyFileSync(join(here, 'worker.mjs'), join(cfDir, 'worker.mjs'))
  copyFileSync(join(here, 'wrangler.toml'), join(cfDir, 'wrangler.toml'))

  console.log('smoke:edge:cf: npm install (packed tarball)')
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', '--silent'], {
    cwd: consumer,
    stdio: 'inherit',
    env: process.env
  })

  // 3. Upload an ephemeral version -> a *.workers.dev preview URL (no live-route promotion).
  console.log(`smoke:edge:cf: wrangler versions upload (name ${workerName})`)
  // NO_COLOR is set for the child, so the output is plain; match the URL directly.
  const out = wrangler(
    ['versions', 'upload', '--config', 'cloudflare/wrangler.toml', '--name', workerName],
    {stdio: ['ignore', 'pipe', 'inherit']}
  )
  const match = out.match(/https?:\/\/[^\s"']+\.workers\.dev[^\s"']*/)
  if (!match) {
    throw new Error(`could not find a *.workers.dev preview URL in wrangler output:\n${out}`)
  }
  const previewUrl = match[0].replace(/[).]+$/, '')
  console.log(`smoke:edge:cf: preview URL ${previewUrl}`)

  // 4. Assert positive extraction: the deployed worker's card exact-matches EXPECTED.
  const cardUrl = `${previewUrl}?url=${encodeURIComponent(target)}`
  console.log(`smoke:edge:cf: GET ${cardUrl}`)
  const card = await fetchCard(cardUrl)
  const subset = {}
  for (const key of Object.keys(EXPECTED)) subset[key] = card[key]
  deepEqual(subset, EXPECTED, 'smoke:edge:cf: deployed worker card mismatch vs EXPECTED')

  console.log('smoke:edge:cf: OK (real Workers deploy ran fromUrl, card exact-match EXPECTED)')
} catch (err) {
  console.error(`smoke:edge:cf: FAIL ${err?.message ?? err}`)
  process.exitCode = 1
} finally {
  // 5. ALWAYS tear down the worker, then remove the consumer dir.
  if (consumer) {
    try {
      console.log(`smoke:edge:cf: wrangler delete (name ${workerName})`)
      wrangler(['delete', '--name', workerName], {stdio: 'inherit'})
    } catch (err) {
      console.error(`smoke:edge:cf: wrangler delete failed, trying REST: ${err?.message ?? err}`)
      await restDelete()
    }
    rmSync(consumer, {recursive: true, force: true})
  }
}
