# Build: Deno Deploy deployed tier-2 job — BLOCKED (Deno EA signup)

Type: task
Status: open
Blocked by: external — Deno Deploy EA signup (see body); + ticket 13

## Question

> **Blocked on external signup (2026-09-09): Deno Deploy account creation returns
> `403 SIGNUP_UNAVAILABLE`.** Do not claim until signup reopens. Deno the runtime stays covered by the
> local tier-2 run (ticket 12) in the meantime; this ticket only adds the *deployed* Deno Deploy
> signal, which is allowed-to-fail and non-gating (ticket 10).

When signup reopens: provision `DENO_DEPLOY_TOKEN` + org / app / region (ticket 09's deferred Deno
section), then build the Deno Deploy shim over the shared edge handler (ticket 13) and its CI job per
the deployment model (ticket 08): a **persistent** app (no free per-run teardown), `deno deploy
--prod` authenticated by `DENO_DEPLOY_TOKEN`, curl the deployed URL (against the Pages fixture, ticket
12) → assert the card. Add it to `edge-e2e.yml` (ticket 15) as another allowed-to-fail deployed job.

Done = a real Deno Deploy deploy runs `fromUrl` and asserts the card, wired into CI.
