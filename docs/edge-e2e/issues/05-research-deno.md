# Research: Deno + Deno Deploy – local run, CI deploy, npm: resolution, native fetch

Type: research
Status: resolved

## Question

Surface the facts a Deno e2e job depends on, for **both** local Deno (a cheap local runtime, like
Bun/Node) **and** Deno Deploy (the edge platform). Findings land in
[`../research/deno.md`](../research/deno.md); resolve with a gist + link into Decisions-so-far.

Investigate (primary sources – Deno / Deno Deploy docs):

1. **Import an npm package in Deno.** How Deno resolves `npm:hypertag` and its **subpath exports**
   (`npm:hypertag/parse`, `npm:hypertag/meta`), whether an import map or `deno.json` is needed, and
   whether **ESM-only** just works. Any `--allow-net` / permission flags a `fromUrl` run needs.
2. **Run tier 1 locally under Deno** – the simplest command (`deno run` / `deno test`) that loads
   the package and asserts, and how the tier-1 harness (ticket 01) must be shaped to be Deno-safe
   (e.g. avoid `node:assert`, or rely on Deno's `node:` compat – confirm which).
3. **Deploy to Deno Deploy from CI.** `deployctl`, token/project auth as env vars, whether a
   per-CI-run **ephemeral** deploy is possible, and whether an npm-dependent module deploys cleanly
   (Deploy's build vs local `npm:` resolution differences).
4. **Outbound `fetch`** from a Deno Deploy isolate to an arbitrary URL (tier 2), and any limits.
5. **Free-tier feasibility** + what must pre-exist in the account (feeds ticket 09).

Output: `deno.md` with citations, separating **local Deno** facts (cheap, no account) from **Deno
Deploy** facts (needs provisioning), plus the "what CI needs" list for tickets 08/09/10.

## Answer

Findings: [`../research/deno.md`](../research/deno.md). Local Deno is trivial; Deno Deploy is
feasible on free tier but the platform changed materially in mid-2026 – the ticket's `deployctl`
premise is now wrong.

- **Local Deno (cheap, no account):** `npm:hypertag`, `npm:hypertag/parse`, `npm:hypertag/meta`
  resolve straight from Deno's global cache – **no `deno.json`, no `node_modules`, no import map**;
  ESM-only is fine. Pure import+parse needs **no flags**; a local `fromUrl` needs `--allow-net`.
  `node:assert` **works** under Deno's `node:` compat (Deno 2.8, 75%+ of Node's test suite passes),
  so the smoke's `import assert from 'node:assert'` can stay – only `../parse.js` → `npm:hypertag/parse`.
- **Deno Deploy correction:** **Deploy Classic + `deployctl` were shut down 20 Jul 2026** (past).
  Current path is the built-in **`deno deploy`** CLI with **`DENO_DEPLOY_TOKEN`**;
  `deno deploy create --source local …` runs non-interactively. Free tier ($0: 1M req/mo, 20 GiB
  egress, 15 builds/hr, 1 concurrent build) covers CI; outbound native `fetch` is explicitly
  unrestricted. Tier-2 endpoints use **`Deno.serve()`**, not legacy `std/http`.
- **Teardown caveat that shapes ticket 08:** there is **no one-shot auto-teardown primitive** on
  free tier – you script create→test→delete or reuse a fixed app; true ephemeral **Sandboxes are
  Pro-only**.
- **Harness LCD note:** for a *shared* harness across Workers/Vercel too, prefer a hand-rolled
  assert (`node:assert` isn't guaranteed on those without compat) – reinforces ticket 01.

Feeds: ticket 01 (import surface `npm:hypertag/*`; assert portability), ticket 08 (Deno has no free
auto-teardown → hybrid/persistent likely for Deno), ticket 09 (account + **organization** +
`DENO_DEPLOY_TOKEN`; Deno Deploy GitHub App if using integration deploys).
