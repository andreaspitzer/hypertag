# Edge-runtime end-to-end verification (wayfinder:map)

## Destination

**Working, two-tier end-to-end tests that prove hypertag actually runs on every runtime the
README claims – green in CI.** The runtimes in scope: **Cloudflare Workers, Deno + Deno Deploy,
Vercel Edge, Bun, and Node** (baseline). Two tiers: a cheap **import + parse** smoke on every
runtime, plus the **full `fromUrl` network path** deployed and hit for real where it matters. The
end state is real tests that deploy/run and stay green on every push – not a plan to write them
later.

> **Execution is the destination.** This map overrides wayfinder's plan-don't-do default (see
> Notes): its `task` tickets *do the work* – provisioning, deploying, wiring CI – not merely
> decide. The `grilling` tickets still settle decisions first so the build isn't guesswork.

## Notes

- **Two tiers, and what each catches:**
  - **Tier 1 – import + parse (in-process, no network).** Load the package and run
    `parse`/`metadata` on HTML strings. Catches ESM-only / subpath-export / bundling / API-surface
    breakage per runtime. *Partly exists:* `scripts/smoke.js` (run by `npm run smoke` and the CI
    `smoke` job, Node 18–24) already does this **for Node only**, and it imports **relative source
    paths** (`../parse.js`), not the `hypertag/parse` package subpaths. This effort extends it
    across runtimes and decides the import surface (ticket 01).
  - **Tier 2 – full `fromUrl` over the real network.** Deploy an endpoint per provider that calls
    `fromUrl(liveUrl)` with the runtime's **native** `fetch`, and assert the card. **Genuinely new:**
    `scripts/smoke.js` stubs `fromUrl` with a fake injected `fetch`, so the native-fetch path is
    untested on *every* runtime, Node included.
- **The one runtime-divergent surface** (`CONTEXT.md`): every layer up to `meta` is pure
  **string-in**, reaching outside the process never; `fetch` (layer 4, `fromUrl`) is the **sole**
  network-touching layer. So tier 1 is about *loading* the library; tier 2 is about the *native
  `fetch`* behaving the same everywhere. Weight the effort accordingly.
- **Existing ground to build on / not duplicate:** `.github/workflows/ci.yml` has a Node-only
  `smoke` job; `scripts/smoke.js` is the tier-1 harness; `release.yml` handles releases. Package is
  **ESM-only**, `engines: >=18`, subpath exports `.` `/parse` `/select` `/sanitize` `/ld` `/meta`
  `/fetch` `/oembed`. The README claims "**no `nodejs_compat` flag**" on Workers – tier 1 must not
  quietly rely on it.
- **Skills / docs to consult:** `/research` for provider CI-deploy mechanics (the research tickets);
  `CONTEXT.md` + `docs/adr/` for the layering rules; `docs/agents/issue-tracker.md` for the
  local-markdown wayfinding operations (claim / resolve / blocking / frontier).
- **Provisioning is HITL.** The edge accounts (Cloudflare, Deno Deploy, Vercel) and their CI
  credentials belong to the maintainer; ticket 09 hands over a precise checklist rather than the
  agent creating accounts.
- **Standing prefs:** metric units; endash, never emdash.

## Decisions so far

<!-- index of closed tickets: one line each, gist + link; detail lives in the ticket -->

- [Research: Cloudflare Workers](issues/04-research-cloudflare-workers.md) — viable free-tier target;
  wrangler v4 esbuild should resolve the ESM subpath exports (tier 1 proves it), `nodejs_compat`
  avoidable for the library, ephemeral `workers.dev` deploy→curl→delete works with a
  `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit) + account id. Catch: the test worker must avoid
  `node:assert`. Full facts in [`research/cloudflare-workers.md`](research/cloudflare-workers.md).
- [Research: Deno + Deno Deploy](issues/05-research-deno.md) — local Deno resolves `npm:hypertag/*`
  from cache with no config and `node:assert` works there; **but `deployctl`/Deploy Classic were shut
  down 20 Jul 2026** — current path is the `deno deploy` CLI + `DENO_DEPLOY_TOKEN`, free tier covers
  CI, yet there's **no free auto-teardown** (Sandboxes are Pro-only), which shapes the deployment
  model. Full facts in [`research/deno.md`](research/deno.md).
- [Research: Vercel Edge](issues/06-research-vercel-edge.md) — ESM fits the V8-isolate edge runtime
  (subpath proven by tier 1); ephemeral preview deploy works on Hobby via `vercel deploy --yes`
  (pre-create the project). Real blocker: **preview-URL protection** needs a Protection-Bypass secret
  to curl. Correction: use `export const config = {runtime:'edge'}`, not `export const runtime`. Full
  facts in [`research/vercel-edge.md`](research/vercel-edge.md).
- [Research: Bun + Node](issues/07-research-bun-node.md) — both local-only in CI (no provisioning),
  both honour the subpath `exports` map, both give a native-`fetch` tier-2 signal locally (stable
  fetch since Node v21). No `npm pack` needed for an in-repo harness (self-referencing); `node:assert`
  is safe on Bun/Node but not the cross-runtime LCD. Full facts in
  [`research/bun-node.md`](research/bun-node.md).

**Frontier now:** the three decision tickets (tier-1 contract, tier-2 contract, version-under-test)
plus — newly unblocked by the research — [Deployment model](issues/08-deployment-model.md) and
[Provision accounts + CI secrets](issues/09-provision-accounts-secrets.md). Ticket 10 (CI structure)
stays blocked behind the deployment-model decision. A cross-cutting finding for ticket 01: the shared
tier-1 assertion harness cannot rely on `node:assert` (fine on Node/Bun/Deno, not guaranteed on
Workers/Vercel) — the lowest-common-denominator is a plain throwing assert.

## Not yet specified

<!-- in-scope fog; graduates into tickets as the frontier advances -->

- **The portable tier-1 harness, per runtime.** Once the import surface is settled (01) and each
  runtime's module resolution is known (04–07), the actual runtime-portable smoke files/commands.
  One patch, likely several tickets (one per runtime, or one shared harness + per-runtime runners).
- **The tier-2 endpoint app(s) + live-URL assertions.** Graduates from the tier-2 contract (02),
  the deployment model (08), and provisioning (09): the small `fromUrl` handler per provider, the
  target it hits, and how the CI job asserts the returned card.
- **The GitHub Actions wiring itself.** The concrete jobs/matrix/secrets that run both tiers across
  the runtimes, graduating from the CI-structure decision (10) and provisioning (09).
- **README / claim reconciliation.** If a runtime fails or needs a caveat (a real ESM/bundling gap,
  a `nodejs_compat` dependency, an outbound-fetch restriction), reconciling the README's "runs on …
  every edge runtime" claim + badges to what the tests actually prove. Downstream once tests reveal
  reality.

## Out of scope

<!-- ruled beyond the destination; never graduates -->

- **Runtimes not in the chosen set** – Netlify Edge, Fastly Compute, AWS Lambda@Edge, etc. The
  README's "every edge runtime" is not exhaustively proven here; adding one is a fresh effort.
- **Re-validating the benchmark / performance tables on edge.** This effort proves *it runs*, not
  *how fast*; the speed/size/memory tables are a separate concern.
- **Fixing library defects the tests uncover.** A genuine failure (hypertag doesn't actually run
  somewhere) spawns its own feature issue under `docs/<slug>/`; this effort delivers the *tests* and
  reconciles the *claims*. Reconciling the README to reality is in scope (fog above); patching the
  library is not.
