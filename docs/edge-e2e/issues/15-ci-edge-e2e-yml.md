# Build: edge-e2e.yml GitHub Actions wiring

Type: task
Status: resolved
Blocked by: 11, 12, 13, 14

## Question

Wire the CI per the structure decision (ticket 10): a new `.github/workflows/edge-e2e.yml` **beside**
the existing Node `smoke` job (leave that in place). A `pack` job publishes the tarball artifact
(ticket 03); a **runtime matrix** (Node 18/20/22/24 via `setup-node`, Bun via `setup-bun`, Deno via
`setup-deno`) runs tier 1 + local tier 2 (tickets 11, 12) on every push/PR and **gates release**
(extends the `prepublishOnly` precedent). The Cloudflare and Vercel **deployed** tier-2 jobs (tickets
13, 14) run on default-branch / `workflow_dispatch`, **allowed to fail** (`continue-on-error` /
separate badge, never redden core CI) and are **not** a hard release gate. Fork PRs run tier 1 + local
tier 2 only (secrets unavailable there).

Done = `edge-e2e.yml` green on push (required jobs), deployed jobs green on the default branch.

## Answer

Done (commit `7c2bb69`). `.github/workflows/edge-e2e.yml` beside `ci.yml` (untouched) +
`test/edge/serve-fixture.mjs` + `smoke:edge:serve-fixture`.

- Triggers: `push`, `pull_request`, `workflow_dispatch`.
- **Required matrix** (push + PR, `fail-fast: false`): `node` (18/20/22/24), `bun`, `deno` – each runs
  `smoke:edge:tier1:<rt>` + `smoke:edge:tier2:<rt>`. **Tier-2 bootstrap:** each job starts
  `serve-fixture.mjs` (port 8787) and sets `EDGE_E2E_FIXTURE_URL` to localhost, so the required matrix
  is green **independent of live Pages** (the fixture's `og:image`/`og:url` are absolute, so `EXPECTED`
  still holds). `tier2.mjs`'s default was left unchanged.
- **Deployed jobs** (push to master + `workflow_dispatch` only, `if:`-gated off PRs,
  `continue-on-error: true`): `cloudflare` (`smoke:edge:cf`, `CLOUDFLARE_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID`) and `vercel` (`smoke:edge:vercel`, `VERCEL_TOKEN`/`ORG`/`PROJECT` + job
  `permissions: id-token: write`). Deno Deploy job omitted (ticket 16 blocked; YAML comment marks it).
- No pack job (the scripts self-pack via `pack-run.mjs`). `prepublishOnly` left as-is (tier-2 is
  network-dependent).

Verified here: `actionlint` clean; matrix tier-2 green on Node + Bun via `serve-fixture.mjs` exactly as
CI drives it; deploy-checks self-skip (exit 0) without secrets; full suite + tier-1 + handler green;
biome lint clean. Real CI proves: the Deno jobs, the live CF/Vercel deploys, and the background server
persisting across steps on GitHub runners.

**Maintainer follow-ups:** (1) **Pages Source = "GitHub Actions"** so the fixture is live for the
deployed jobs on master; (2) mark the six **`tier-1-and-local-tier-2 (...)` matrix jobs** as required
status checks on `master` – NOT the allowed-to-fail deploy jobs.
