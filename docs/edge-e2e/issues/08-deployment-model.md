# Deployment model: ephemeral per-CI deploys vs a persistent endpoint

Type: grilling
Status: resolved
Blocked by: 04, 05, 06

## Question

Decide **how the tier-2 endpoints exist** across the three deploy targets (Cloudflare Workers, Deno
Deploy, Vercel Edge). Blocked until the three deploy-provider research tickets (04, 05, 06) report
what each platform actually supports for CI deploys.

The axis:

- **Ephemeral per-CI-run.** Each CI run deploys a fresh preview/worker, hits it, asserts, tears it
  down. Always tests the current code; no drift; but slower per run, needs teardown, and needs
  deploy credentials with create/delete scope. Depends on each provider supporting a scriptable,
  non-interactive preview deploy (the research answers this).
- **Persistent endpoint per provider, redeployed on change.** A long-lived URL per provider that CI
  redeploys when the library changes and otherwise just curls. Faster per run, simpler assertion
  step, but the endpoint can drift from the code and is a standing resource to own.
- **Hybrid.** Persistent for the platforms where ephemeral is painful, ephemeral where it's cheap.

Decide also:

- **Teardown / cost control** for whichever model – how ephemeral deploys are cleaned up, or how the
  persistent endpoints are kept minimal.
- **Same code, N providers.** One shared edge-handler source deployed to all three (adapter shims
  per provider), or a hand-written handler per provider? Ties to the tier-2 contract (ticket 02).
- **Auth on preview URLs.** If a provider protects preview deployments by default (flagged in the
  Vercel research), how CI reaches the URL to assert.

Output: the chosen deployment model (per provider if hybrid), the teardown approach, and the
handler-sharing decision – feeding the CI-structure decision (10) and the graduated endpoint +
CI-wiring tickets.

## Answer

**Hybrid, dictated by what each platform actually supports for free CI (research 04/05/06):**

- **Cloudflare Workers – ephemeral per-CI-run.** `wrangler versions upload` returns a preview URL
  (no promotion over the live route); CI curls it, then a `finally` step runs
  `wrangler delete --name <unique-per-run>` so teardown happens even on failure. Unique names avoid
  collisions. (`wrangler deploy --temporary` is *not* usable – it is ignored once
  `CLOUDFLARE_API_TOKEN` is set.)
- **Vercel Edge – ephemeral preview.** `vercel deploy --yes` builds a fresh preview per run; CI
  reaches it with the **Protection-Bypass** secret (`x-vercel-protection-bypass` header) since Hobby
  preview URLs are protected by default. Previews expire on their own – no explicit teardown.
- **Deno Deploy – persistent endpoint, redeployed on change.** The new platform has **no free
  auto-teardown** (Sandboxes are Pro-only; `deployctl`/Classic are sunset). One long-lived app is
  `deno deploy --prod`-redeployed when the library changes, and CI curls its stable URL.

**Teardown / cost:** Cloudflare explicit `delete`; Vercel preview auto-expiry; Deno one standing
minimal app. All three free-tier.

**Same code, N providers: one shared edge-handler source + thin per-provider adapter shims** – the
handler calls `fromUrl(fixtureUrl)` and returns the card as JSON; the shims are Workers
`export default { fetch }`, Vercel a handler + `export const config = { runtime: 'edge' }`, Deno
`Deno.serve(...)`. (Ties to the tier-2 contract in ticket 02.)

**Auth on preview URLs:** only Vercel needs it (the `VERCEL_AUTOMATION_BYPASS_SECRET`); Cloudflare
preview URLs and the Deno app URL are reachable without a secret.
