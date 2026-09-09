// Vercel Edge ephemeral preview deploy-and-assert (tickets 08 + 14).
//
// This is the script ticket 15's CI job invokes (`npm run smoke:edge:vercel`). It runs the
// full tier-2 fetch path on a REAL Vercel Edge Function over the network. The flow (ticket
// 08's hybrid model, Vercel = ephemeral preview; previews auto-expire, so no teardown):
//
//   1. pack the publishable tarball into a throwaway consumer (reuses pack-run.mjs's
//      packConsumer, so the deployed function bundles the REAL published package, ticket 03),
//   2. lay the shared handler + the Vercel `/api` wrapper + vercel.json into that consumer
//      and `npm install` the tarball there,
//   3. deploy an ephemeral PREVIEW with the documented CI trio, authed by VERCEL_TOKEN with
//      VERCEL_ORG_ID / VERCEL_PROJECT_ID in the env (ticket 09):
//         vercel pull --yes --environment=preview   (link + pull project settings)
//         vercel build                              (build once, in CI)
//         vercel deploy --prebuilt                  (upload .vercel/output -> preview URL)
//      and capture the `*.vercel.app` preview URL printed to stdout by `vercel deploy`,
//   4. reach the protection-guarded preview via TRUSTED SOURCES (OIDC): mint a short-lived
//      GitHub Actions OIDC token and present it in the `x-vercel-trusted-oidc-idp-token`
//      header (see fetchOidcToken below) - NO static bypass secret (ticket 09), then fetch
//      `<previewUrl>/api/edge-e2e?url=<FIXTURE_URL>` and assert the returned card
//      exact-matches tier-2's frozen EXPECTED (positive extraction, reusing assert.mjs +
//      tier2.mjs).
//
// Non-zero exit on any assertion failure. When the Vercel secrets OR the GitHub Actions
// OIDC request env are absent (i.e. outside CI - a dev sandbox has neither) it SKIPS
// cleanly with exit 0, so it never hard-fails locally.
//
// Trusted Sources OIDC (Vercel docs, "Trusted Sources", updated 2026-08-28):
//   - The caller attaches its OIDC token in the `x-vercel-trusted-oidc-idp-token` header.
//   - For GitHub Actions the dashboard auto-sets the audience to `https://github.com/<org>`,
//     which is what `core.getIDToken()` sends with no argument; we mint the same token from
//     the runner's OIDC endpoint (ACTIONS_ID_TOKEN_REQUEST_URL / _TOKEN) with that audience.
//   - The CI job must grant `permissions: id-token: write` for that endpoint to exist.
//   Note: OIDC only authorises the ASSERT request to the protected preview. Vercel does NOT
//   support OIDC for the DEPLOY itself, so the deploy trio still uses the static VERCEL_TOKEN.

import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdirSync, rmSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deepEqual} from '../assert.mjs'
import {packConsumer} from '../pack-run.mjs'
import {EXPECTED, FIXTURE_URL} from '../tier2.mjs'

const here = dirname(fileURLToPath(import.meta.url))

// The live fixture the deployed function unfurls (ticket 02). Same URL tier-2 + every other
// deployed provider hit; override for a one-off via EDGE_E2E_FIXTURE_URL.
const target = process.env.EDGE_E2E_FIXTURE_URL || FIXTURE_URL

// The Vercel CLI is a dev/CI tool, invoked via npx (never a runtime dependency). Vercel's
// GitHub Actions guide installs `vercel@latest`; match it.
const VERCEL = ['--yes', 'vercel@latest']

const sleep = ms => new Promise(r => setTimeout(r, ms))

// --- skip cleanly when the deploy secrets or the OIDC request env are absent (outside CI) --
const {VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID} = process.env
// The GitHub Actions OIDC endpoint (present only when the job has `id-token: write`), or a
// token supplied directly (e.g. minted by a prior github-script step) via env.
const suppliedOidcToken = process.env.EDGE_E2E_VERCEL_OIDC_TOKEN
const oidcReqUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
const oidcReqToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
const hasOidc = Boolean(suppliedOidcToken || (oidcReqUrl && oidcReqToken))

if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID || !hasOidc) {
  console.log(
    'smoke:edge:vercel: SKIP - need VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID plus a ' +
      'GitHub Actions OIDC token (ACTIONS_ID_TOKEN_REQUEST_URL + _TOKEN, from `permissions: ' +
      'id-token: write`) to reach the Trusted-Sources-protected preview. Expected outside CI. Exit 0.'
  )
  process.exit(0)
}

// Audience Vercel's Trusted Sources guided form auto-configures for GitHub Actions:
// `https://github.com/<account>`. Derived from GITHUB_REPOSITORY_OWNER on the runner;
// override with VERCEL_OIDC_AUDIENCE if the dashboard uses a custom audience.
const oidcAudience =
  process.env.VERCEL_OIDC_AUDIENCE ||
  (process.env.GITHUB_REPOSITORY_OWNER
    ? `https://github.com/${process.env.GITHUB_REPOSITORY_OWNER}`
    : 'https://github.com/andreaspitzer')

// Mint the short-lived GitHub Actions OIDC token to present to the protected preview.
// Equivalent to `core.getIDToken(audience)`, done over the documented runner REST endpoint
// so this stays a plain Node script (no github-script step required).
async function fetchOidcToken() {
  if (suppliedOidcToken) return suppliedOidcToken
  const url = `${oidcReqUrl}&audience=${encodeURIComponent(oidcAudience)}`
  const res = await fetch(url, {headers: {authorization: `Bearer ${oidcReqToken}`}})
  if (!res.ok) throw new Error(`OIDC token request failed: HTTP ${res.status}`)
  const body = await res.json()
  if (!body?.value) throw new Error('OIDC token request returned no `value`')
  return body.value
}

const vercel = (args, opts = {}) =>
  execFileSync('npx', [...VERCEL, ...args, '--token', VERCEL_TOKEN], {
    cwd: consumer,
    // VERCEL_ORG_ID / VERCEL_PROJECT_ID come from process.env; NO_COLOR keeps output plain.
    env: {...process.env, NO_COLOR: '1'},
    encoding: 'utf8',
    ...opts
  })

// Fetch the preview URL with the OIDC header, retrying while the deploy propagates.
async function fetchCard(url, oidcToken) {
  let lastErr
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetch(url, {headers: {'x-vercel-trusted-oidc-idp-token': oidcToken}})
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
  ;({consumer} = packConsumer({label: 'vercel'}))

  // 2. Lay the shared handler + the Vercel /api wrapper + vercel.json into the consumer,
  //    mirroring the repo layout so api/edge-e2e.js's `import '../handler.mjs'` resolves,
  //    then install the tarball.
  copyFileSync(join(here, '..', 'handler.mjs'), join(consumer, 'handler.mjs'))
  copyFileSync(join(here, 'vercel.json'), join(consumer, 'vercel.json'))
  const apiDir = join(consumer, 'api')
  mkdirSync(apiDir)
  copyFileSync(join(here, 'api', 'edge-e2e.js'), join(apiDir, 'edge-e2e.js'))

  console.log('smoke:edge:vercel: npm install (packed tarball)')
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', '--silent'], {
    cwd: consumer,
    stdio: 'inherit',
    env: process.env
  })

  // 3. Ephemeral preview deploy with the documented CI trio (build once, in CI).
  console.log('smoke:edge:vercel: vercel pull --environment=preview')
  vercel(['pull', '--yes', '--environment=preview'], {stdio: 'inherit'})
  console.log('smoke:edge:vercel: vercel build')
  vercel(['build'], {stdio: 'inherit'})
  console.log('smoke:edge:vercel: vercel deploy --prebuilt')
  // `vercel deploy` prints progress to stderr and the deployment URL to stdout; capture it.
  const out = vercel(['deploy', '--prebuilt'], {stdio: ['ignore', 'pipe', 'inherit']})
  const matches = out.match(/https?:\/\/[^\s"']+\.vercel\.app[^\s"']*/g)
  if (!matches || matches.length === 0) {
    throw new Error(`could not find a *.vercel.app preview URL in vercel deploy output:\n${out}`)
  }
  const previewUrl = matches[matches.length - 1].replace(/[).]+$/, '')
  console.log(`smoke:edge:vercel: preview URL ${previewUrl}`)

  // 4. Mint the OIDC token, then assert positive extraction against the protected preview.
  const oidcToken = await fetchOidcToken()
  const cardUrl = `${previewUrl}/api/edge-e2e?url=${encodeURIComponent(target)}`
  console.log(`smoke:edge:vercel: GET ${cardUrl} (Trusted Sources OIDC)`)
  const card = await fetchCard(cardUrl, oidcToken)
  const subset = {}
  for (const key of Object.keys(EXPECTED)) subset[key] = card[key]
  deepEqual(subset, EXPECTED, 'smoke:edge:vercel: deployed function card mismatch vs EXPECTED')

  console.log('smoke:edge:vercel: OK (real Vercel Edge deploy ran fromUrl, card exact-match EXPECTED)')
} catch (err) {
  console.error(`smoke:edge:vercel: FAIL ${err?.message ?? err}`)
  process.exitCode = 1
} finally {
  // Preview deployments auto-expire (ticket 08) - no explicit teardown; just drop the consumer.
  if (consumer) rmSync(consumer, {recursive: true, force: true})
}
