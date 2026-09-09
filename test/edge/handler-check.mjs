// Local validation of the shared edge handler (handler.mjs) WITHOUT any deploy
// (ticket 13). It proves the handler + `fromUrl` path end-to-end - independent of the
// Workers/Vercel/Deno runtimes - so tickets 14/16 can wrap the SAME handler with
// confidence and the Cloudflare deploy leg (deploy-check.mjs) is the only thing left
// that actually needs the network + secrets.
//
// Like tier-2 it runs INSIDE the packed-tarball consumer (see run-handler.mjs), so the
// handler's bare `hypertag/fetch` import resolves to the INSTALLED package. A localhost
// `node:http` server serves the committed fixture (the same trick tier-2's local run
// uses); we call the web-standard handler with `new Request('.../?url=<localhost>')`,
// and assert the JSON body's card exact-matches tier-2's frozen EXPECTED table (reused,
// never redefined). `node:http`/`node:fs` here are the HARNESS, not the worker - the
// worker itself stays free of `node:*`.

import {readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import handler from './handler.mjs'
import {deepEqual, equal, ok} from './assert.mjs'
import {EXPECTED} from './tier2.mjs'

const fixtureFile = process.env.EDGE_E2E_HANDLER_FIXTURE
if (!fixtureFile) {
  console.error('handler-check: EDGE_E2E_HANDLER_FIXTURE (fixture file path) not set')
  process.exit(2)
}
const html = readFileSync(fixtureFile, 'utf8')

// Serve the committed fixture from 127.0.0.1 on an ephemeral port. og:image/og:url in
// the fixture are ABSOLUTE, so the extracted card matches EXPECTED regardless of where
// the page is served from (see the fixture's own notes) - localhost here is fine.
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
  const server = await serveFixture()
  const {port} = server.address()
  const base = `http://127.0.0.1:${port}/`

  try {
    // 1. Happy path: ?url=<localhost fixture> -> 200 + the card as application/json.
    const res = await handler(new Request(`${base}?url=${encodeURIComponent(base)}`))
    equal(res.status, 200, `handler: expected 200, got ${res.status}`)
    ok(
      (res.headers.get('content-type') || '').includes('application/json'),
      'handler: response is not application/json'
    )
    const card = await res.json()
    ok(card, 'handler: empty card')
    // Exact-match the four canonical fields against tier-2's frozen EXPECTED.
    const subset = {}
    for (const key of Object.keys(EXPECTED)) subset[key] = card[key]
    deepEqual(subset, EXPECTED, 'handler: card mismatch vs EXPECTED')

    // 2. Missing `url` param -> non-200 JSON error body (documented contract).
    const missing = await handler(new Request(base))
    ok(missing.status >= 400, `handler: missing-url expected >=400, got ${missing.status}`)
    const missingBody = await missing.json()
    ok(missingBody.error, 'handler: missing-url response has no error field')

    console.log(`handler-check: OK (handler card exact-match EXPECTED) <- ${base}`)
  } finally {
    server.close()
  }
}

main().catch(err => {
  console.error(`handler-check: FAIL ${err?.message ?? err}`)
  process.exit(1)
})
