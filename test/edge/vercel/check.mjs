// Local validation of the Vercel `/api` wrapper (api/edge-e2e.js) WITHOUT any deploy
// (ticket 14). The shared handler is already proven end-to-end on workerd (ticket 13);
// this proves the Vercel-SPECIFIC wrapper module - the one carrying
// `export const config = {runtime: 'edge'}` - loads, exposes the right config, and
// delegates to the shared handler correctly.
//
// Like tier-2 / handler-check it runs INSIDE the packed-tarball consumer (see
// run-vercel.mjs), so the wrapper's bare `hypertag/fetch` import (via handler.mjs)
// resolves to the INSTALLED package. A localhost `node:http` server serves the committed
// fixture (the same trick tier-2's local run uses); we call the wrapper's default export
// with `new Request('.../?url=<localhost>')` and assert the JSON body's card exact-matches
// tier-2's frozen EXPECTED table (reused, never redefined). `node:http`/`node:fs` here are
// the HARNESS, not the edge function - the function itself stays free of `node:*`.

import {readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import handler, {config} from './api/edge-e2e.js'
import {deepEqual, equal, ok} from './assert.mjs'
import {EXPECTED} from './tier2.mjs'

const fixtureFile = process.env.EDGE_E2E_HANDLER_FIXTURE
if (!fixtureFile) {
  console.error('vercel-check: EDGE_E2E_HANDLER_FIXTURE (fixture file path) not set')
  process.exit(2)
}
const html = readFileSync(fixtureFile, 'utf8')

// Serve the committed fixture from 127.0.0.1 on an ephemeral port. og:image/og:url in the
// fixture are ABSOLUTE, so the extracted card matches EXPECTED wherever it is served from.
function serveFixture() {
  return new Promise(resolve => {
    const server = createServer((_req, res) => {
      res.writeHead(200, {'content-type': 'text/html; charset=utf-8'})
      res.end(html)
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

async function main() {
  // The `config` export is the ONLY Vercel-specific glue - assert it selects the edge
  // runtime, which is the one thing this wrapper adds over the shared handler.
  ok(
    config && config.runtime === 'edge',
    `vercel-check: expected config.runtime 'edge', got ${config?.runtime}`
  )

  const server = await serveFixture()
  const {port} = server.address()
  const base = `http://127.0.0.1:${port}/`

  try {
    // 1. Happy path: ?url=<localhost fixture> -> 200 + the card as application/json.
    const res = await handler(new Request(`${base}?url=${encodeURIComponent(base)}`))
    equal(res.status, 200, `vercel-check: expected 200, got ${res.status}`)
    ok(
      (res.headers.get('content-type') || '').includes('application/json'),
      'vercel-check: response is not application/json'
    )
    const card = await res.json()
    ok(card, 'vercel-check: empty card')
    // Exact-match the four canonical fields against tier-2's frozen EXPECTED.
    const subset = {}
    for (const key of Object.keys(EXPECTED)) subset[key] = card[key]
    deepEqual(subset, EXPECTED, 'vercel-check: wrapper card mismatch vs EXPECTED')

    // 2. Missing `url` param -> non-200 JSON error body (shared handler's contract).
    const missing = await handler(new Request(base))
    ok(missing.status >= 400, `vercel-check: missing-url expected >=400, got ${missing.status}`)
    const missingBody = await missing.json()
    ok(missingBody.error, 'vercel-check: missing-url response has no error field')

    console.log(
      `vercel-check: OK (wrapper config.runtime=edge, card exact-match EXPECTED) <- ${base}`
    )
  } finally {
    server.close()
  }
}

main().catch(err => {
  console.error(`vercel-check: FAIL ${err?.message ?? err}`)
  process.exit(1)
})
