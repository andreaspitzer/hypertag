# CI workflow structure: how the two tiers × five runtimes wire into GitHub Actions

Type: grilling
Status: resolved
Blocked by: 08

## Question

Decide the **shape of the CI wiring** that runs both tiers across all five runtimes and stays green.
Blocked by the deployment-model decision (08), which itself waits on the deploy research; the
Bun/Node research (07) and provisioning (09) also feed this but 08 is the hard gate.

Decide:

1. **One workflow or several.** Extend the existing `.github/workflows/ci.yml` (which has the
   Node-only `smoke` job today), add a dedicated `edge-e2e.yml`, or both. Note the existing `smoke`
   job's fate – does tier 1 replace it, or sit beside it?
2. **Triggers.** Tier 1 (cheap, no secrets) can run on every push/PR like the current CI. Tier 2
   (deploys, needs secrets, slower, can't run on fork PRs without exposing secrets) likely runs on a
   narrower trigger – push to master, a release gate, a label, or a schedule. Decide the trigger per
   tier, and how PRs from forks are handled (secrets aren't available there).
3. **Matrix vs per-runtime jobs.** Node/Bun/Deno-local fit a runtime matrix (setup action per
   runtime); the three deploy targets each need bespoke deploy steps – one job each, or a matrix
   with per-provider steps. Reconcile with the deployment model (08).
4. **Secrets exposure + gating.** Which jobs consume which secrets (from ticket 09), and how a
   missing-secret / provider-outage failure is surfaced without permanently reddening the badge
   (required vs allowed-to-fail? separate badge?).
5. **Interaction with `release.yml`.** Should tier 2 gate a release (like `prepublishOnly` gates
   `npm run smoke` today), or run independently?

Output: the CI structure decision – files, jobs, triggers, matrix, secret mapping, and how failures
surface – from which the concrete workflow YAML (fog: "the GitHub Actions wiring itself") graduates.

## Answer

The CI structure that runs both tiers across the five runtimes:

1. **Files: add a dedicated `.github/workflows/edge-e2e.yml`**; leave the existing `ci.yml` `smoke`
   job (Node-only, fast PR feedback) in place for now. Tier 1's cross-runtime matrix lives in the
   new workflow; consolidating the old Node smoke into it is a later cleanup, not this effort
   (never delete a working green job to "tidy up").
2. **Triggers per tier.** Tier 1 + **local** tier 2 (no secrets): every push and PR, like CI today.
   **Deployed** tier 2 (secrets, slower, can't run on fork PRs): push to the default branch +
   `workflow_dispatch`. Fork PRs run tier 1 + local tier 2 only (secrets are unavailable there).
3. **Matrix vs jobs.** Tier 1 and local tier 2 run as a **runtime matrix** – Node (18/20/22/24 via
   `setup-node`), Bun (`setup-bun`), Deno (`setup-deno`) – each installing the packed tarball (03)
   and running the shared module (01) / local `fromUrl` (02). The three deploy targets are **one
   bespoke job each** (deploy → assert → teardown), per the hybrid model (08).
4. **Secrets + gating.** A `pack` job publishes the tarball artifact; runtime jobs consume it. The
   deploy jobs consume only their own provider secrets (ticket 09). **Required vs allowed-to-fail:**
   tier 1 + local tier 2 are **required** (gate the badge); the three **deployed** tier-2 jobs are
   **allowed to fail** (`continue-on-error` / a separate `edge-deploy` badge) so a provider outage or
   a missing secret never permanently reddens core CI.
5. **Release interaction.** Tier 1 + local tier 2 gate release (the existing `prepublishOnly`
   `npm test && npm run smoke` precedent extends to them). Deployed tier 2 runs independently on the
   default branch / dispatch and is **not** a hard release gate – a third-party provider outage must
   not block a publish.
