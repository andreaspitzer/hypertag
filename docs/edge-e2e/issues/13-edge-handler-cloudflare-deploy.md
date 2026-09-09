# Build: shared edge handler + Cloudflare Workers deployed tier-2 job

Type: task
Status: resolved
Blocked by:

## Question

Build the **one shared edge handler** (a tiny endpoint that calls `fromUrl(liveUrl)` and returns the
card as JSON) that all three deployed providers reuse via thin shims (ticket 08). Then the Cloudflare
Workers shim + CI job per the hybrid model: **ephemeral** `wrangler versions upload` preview → curl
(against the Pages fixture, ticket 12) → `wrangler delete`. Auth via `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID` (ticket 09, provisioned). The test worker must avoid `node:assert` (no
`nodejs_compat`, ticket 04). Assert **positive extraction** of the card.

Secrets ready (ticket 09). Feeds the CI wiring (ticket 15) as an allowed-to-fail deployed job.

Done = a real ephemeral Workers deploy runs `fromUrl` over the network, asserts the card, then tears
down.

## Answer

Done (commit `fa7d6f2`). Shared edge handler + Cloudflare deploy path:

- `test/edge/handler.mjs` – **the one shared web-standard handler**: `async handler(request) =>
  Response` (default + named). Reads `?url=`, calls `fromUrl` (`import fromUrl from 'hypertag/fetch'`),
  returns the card as JSON (200); **400** on missing url, **502** on fetch error. Zero `node:*`, no
  framework – wrapped by CF `{fetch: handler}`, Vercel `export default handler`, Deno
  `Deno.serve(handler)`.
- `test/edge/cloudflare/worker.mjs` + `wrangler.toml` (`workers_dev`, recent compat date, **no
  nodejs_compat**).
- `test/edge/cloudflare/deploy-check.mjs` – ephemeral flow: pack real tarball → consumer install →
  `wrangler versions upload` (unique name) → parse `*.workers.dev` URL → fetch `?url=<FIXTURE_URL>` →
  deepEqual `EXPECTED` → **always** teardown (`wrangler delete`, REST fallback). **Skips cleanly (exit
  0) when CF secrets absent.** CI invokes via `npm run smoke:edge:cf`.
- `test/edge/handler-check.mjs` + `run-handler.mjs` – deploy-free local handler validation;
  `pack-run.mjs` gained a reusable `packConsumer()`.
- package.json: `smoke:edge:handler[:node|:bun]`, `smoke:edge:cf`.

Verified here: handler-check green (Node + Bun, packed tarball, card == EXPECTED, missing-param case);
**`wrangler dev` ran the worker on local workerd end-to-end and returned the matching card – confirms
no `nodejs_compat` needed.** biome lint clean; full suite + tier-1 + tier-2(localhost) green. Remote
`wrangler versions upload` deferred to CI (sandbox blocks `api.cloudflare.com`, no secrets).

For tickets 14/16: `import handler from '../handler.mjs'`; Vercel `export default handler` +
`export const config = { runtime: 'edge' }`; Deno `Deno.serve(handler)`. Reuse `FIXTURE_URL` /
`EXPECTED` and the deploy-check shape.
