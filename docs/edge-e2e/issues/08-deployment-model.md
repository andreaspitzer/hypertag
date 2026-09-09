# Deployment model: ephemeral per-CI deploys vs a persistent endpoint

Type: grilling
Status: open
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
