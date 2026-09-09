# Build: edge-e2e.yml GitHub Actions wiring

Type: task
Status: claimed
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
