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

- [Research: Cloudflare Workers](issues/04-research-cloudflare-workers.md) – viable free-tier target;
  wrangler v4 esbuild should resolve the ESM subpath exports (tier 1 proves it), `nodejs_compat`
  avoidable for the library, ephemeral `workers.dev` deploy→curl→delete works with a
  `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit) + account id. Catch: the test worker must avoid
  `node:assert`. Full facts in [`research/cloudflare-workers.md`](research/cloudflare-workers.md).
- [Research: Deno + Deno Deploy](issues/05-research-deno.md) – local Deno resolves `npm:hypertag/*`
  from cache with no config and `node:assert` works there; **but `deployctl`/Deploy Classic were shut
  down 20 Jul 2026** – current path is the `deno deploy` CLI + `DENO_DEPLOY_TOKEN`, free tier covers
  CI, yet there's **no free auto-teardown** (Sandboxes are Pro-only), which shapes the deployment
  model. Full facts in [`research/deno.md`](research/deno.md).
- [Research: Vercel Edge](issues/06-research-vercel-edge.md) – ESM fits the V8-isolate edge runtime
  (subpath proven by tier 1); ephemeral preview deploy works on Hobby via `vercel deploy --yes`
  (pre-create the project). Real blocker: **preview-URL protection** needs a Protection-Bypass secret
  to curl. Correction: use `export const config = {runtime:'edge'}`, not `export const runtime`. Full
  facts in [`research/vercel-edge.md`](research/vercel-edge.md).
- [Research: Bun + Node](issues/07-research-bun-node.md) – both local-only in CI (no provisioning),
  both honour the subpath `exports` map, both give a native-`fetch` tier-2 signal locally (stable
  fetch since Node v21). No `npm pack` needed for an in-repo harness (self-referencing); `node:assert`
  is safe on Bun/Node but not the cross-runtime LCD. Full facts in
  [`research/bun-node.md`](research/bun-node.md).
- [Tier-1 smoke contract](issues/01-tier1-smoke-contract.md) – import the **package subpaths** (all
  eight + barrel) from the installed packed tarball; reuse `scripts/smoke.js`'s export-shape contract
  (barrel named-only, colliding helpers off it); assert parse / stripComments / metadata / favicon +
  a **stubbed** `fromUrl`; one shared runtime-agnostic module using a **plain throwing assert** (never
  `node:assert`), with thin per-runtime runners.
- [Tier-2 fetch contract](issues/02-tier2-fetch-contract.md) – `fromUrl` hits **one controlled
  GitHub Pages fixture** (real cross-origin egress, zero third-party flakiness); exact-match on
  title / description / image / url; a local Node / Bun / Deno network-real run too; assert positive
  extraction (never "didn't throw").
- [Version under test](issues/03-version-under-test.md) – the **packed tarball** (`npm pack`),
  pre-release, built once and installed into a throwaway consumer per runtime; package-subpath imports
  only. Optional post-publish `hypertag@latest` smoke deferred.
- [Deployment model](issues/08-deployment-model.md) – **hybrid**: Cloudflare ephemeral
  (`versions upload` preview → curl → `delete`), Vercel ephemeral preview (Protection-Bypass secret),
  Deno Deploy **persistent** (no free teardown). One shared edge handler + thin per-provider shims.
- [CI workflow structure](issues/10-ci-workflow-structure.md) – a new `edge-e2e.yml` beside the
  existing Node `smoke` job; tier 1 + local tier 2 as a runtime matrix on every push/PR (required,
  gate release); the three deployed tier-2 jobs on default-branch / dispatch, **allowed to fail** so
  a provider outage never reddens core CI.
- [Provision accounts + CI secrets](issues/09-provision-accounts-secrets.md) – **done for Cloudflare +
  Vercel + GitHub Pages**; secrets `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` / `VERCEL_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` set, Vercel preview access via **Trusted Sources (OIDC)** (no
  bypass secret), fixture host **https://andreaspitzer.github.io/hypertag/**. **Deno Deploy deferred**
  (`403 SIGNUP_UNAVAILABLE`) → its deployed job is ticket 16.
- [Build: tier-1 harness + runners](issues/11-tier1-harness-runners.md) – `test/edge/` harness
  importing the package subpaths from the packed tarball; runtime-agnostic throwing assert (no
  `node:assert`), pack-install driver, `smoke:edge:tier1[:node|:bun|:deno]`. Node + Bun green locally;
  Deno wired, CI confirms. Commit `f85ac49`.
- [Build: local tier-2 + Pages fixture](issues/12-local-tier2-fixture.md) – controlled fixture +
  `pages.yml` deploy workflow; runtime-agnostic native-`fromUrl` exact-match check (`test/edge/tier2.mjs`,
  `FIXTURE_URL` / `EXPECTED` reused downstream); shared `pack-run.mjs` driver. Node + Bun green
  (localhost); Deno + live URL via CI. Commit `7754eea`. **Needs Pages Source = "GitHub Actions".**
- [Build: shared edge handler + Cloudflare deployed](issues/13-edge-handler-cloudflare-deploy.md) – the
  one web-standard `handler(request)` (reads `?url=`, `fromUrl`, JSON card; 400/502 on error) wrapped
  per provider; CF worker + `wrangler.toml` (no nodejs_compat) + ephemeral `deploy-check.mjs`
  (`smoke:edge:cf`). Handler green on Node/Bun + local workerd (`wrangler dev`); remote deploy via CI.
  Commit `fa7d6f2`.
- [Build: Vercel deployed](issues/14-vercel-edge-deploy.md) – `api/edge-e2e.js` (`config runtime:'edge'`)
  wrapping the shared handler + `vercel.json` (`deploymentEnabled:false`); ephemeral
  `vercel pull/build/deploy --prebuilt` deploy-check (`smoke:edge:vercel`) authorised to the protected
  preview via **Trusted Sources OIDC** (`x-vercel-trusted-oidc-idp-token`, audience
  `github.com/andreaspitzer`). Wrapper green Node/Bun; deploy via CI. Job needs `id-token: write`.
  Commit `00120ed`.
- [Build: edge-e2e.yml CI wiring](issues/15-ci-edge-e2e-yml.md) – required runtime matrix (Node
  18/20/22/24, Bun, Deno) running tier-1 + local tier-2 (fixture served locally via `serve-fixture.mjs`,
  so green off-Pages) on push/PR; CF + Vercel deploy jobs allowed-to-fail on develop/dispatch (Vercel
  with `id-token: write`). actionlint clean, matrix green locally. Commit `7c2bb69`.

**Frontier now: the build is complete.** Tickets 11–15 are built, locally validated, and pushed – the
two-tier edge tests exist and run:

- ✅ [tier-1 harness + runners](issues/11-tier1-harness-runners.md)
- ✅ [local tier-2 + Pages fixture](issues/12-local-tier2-fixture.md)
- ✅ [shared edge handler + Cloudflare deployed](issues/13-edge-handler-cloudflare-deploy.md)
- ✅ [Vercel deployed](issues/14-vercel-edge-deploy.md)
- ✅ [edge-e2e.yml CI wiring](issues/15-ci-edge-e2e-yml.md)

Remaining:

- 🚫 Blocked (external): [Deno Deploy deployed](issues/16-deno-deploy-deploy.md) – awaits Deno EA
  signup (`403 SIGNUP_UNAVAILABLE`); Deno the runtime is covered by the local tier-2 matrix meanwhile.
- Downstream fog: README / claim reconciliation, once CI results reveal reality (see Not yet specified).

**Reaching "green in CI" (the destination) now rests on CI runs + two maintainer settings:**
(1) repo **Settings → Pages → Source = "GitHub Actions"** so the fixture goes live (required for the
deployed jobs on develop); (2) mark the six **`tier-1-and-local-tier-2 (...)`** matrix jobs as required
status checks on `develop` (NOT the allowed-to-fail deploy jobs). The deployed CF/Vercel jobs first run
on push to `develop` / `workflow_dispatch`, never on a PR (the stack merges into `develop`).

## Not yet specified

<!-- in-scope fog; graduates into tickets as the frontier advances -->

<!-- The tier-1 harness, the tier-2 endpoints + live-URL assertions, and the GitHub Actions wiring
have graduated into build tickets 11–16 (see Frontier). Only downstream fog remains: -->

- **README / claim reconciliation.** If a runtime fails or needs a caveat (a real ESM/bundling gap,
  a `nodejs_compat` dependency, an outbound-fetch restriction), reconciling the README's "runs on …
  every edge runtime" claim + badges to what the tests actually prove. Downstream once tests reveal
  reality – graduates after the build tickets run and surface any gaps.

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
