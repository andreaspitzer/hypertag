# CI workflow structure: how the two tiers × five runtimes wire into GitHub Actions

Type: grilling
Status: open
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
