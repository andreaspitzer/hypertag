# Build: shared edge handler + Cloudflare Workers deployed tier-2 job

Type: task
Status: open
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
