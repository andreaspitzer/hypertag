# Research: Cloudflare Workers – CI deploy, ESM/subpath resolution, native fetch, free tier

Type: research
Status: resolved

## Question

Surface the facts a Workers e2e job depends on. Findings land in
[`../research/cloudflare-workers.md`](../research/cloudflare-workers.md); resolve with a gist +
link into the map's Decisions-so-far.

Investigate (primary sources – Cloudflare/wrangler docs):

1. **Deploy from CI, non-interactively.** wrangler version, the `wrangler deploy` flow, the
   `CLOUDFLARE_API_TOKEN` (+ account id) env-var auth, and the minimum token scopes. Is a
   `workers.dev` subdomain deploy enough (no custom domain)? Can a deploy be **ephemeral / preview**
   per CI run and torn down, or is it a persistent worker?
2. **Module resolution for an npm dependency.** How does a Worker bundle `hypertag` – wrangler's
   built-in esbuild, `main`/`module`/`exports` handling, and whether **ESM-only + subpath exports**
   (`hypertag/parse`, `hypertag/meta`) resolve cleanly. Confirm the README's claim that **no
   `nodejs_compat` flag** is needed (does hypertag touch any `node:` builtin? `scripts/smoke.js`
   imports `node:assert` – note that the *test harness*, not the library, must avoid `node:` on
   Workers).
3. **Outbound `fetch`.** Can a Worker `fetch()` an arbitrary external URL (tier 2), and any
   default limits/subrequest caps relevant to a single `fromUrl` call.
4. **Free-tier feasibility.** Does the free plan cover CI deploy + invoke, and what has to exist in
   the account first (feeds the provisioning checklist, ticket 09).

Output: `cloudflare-workers.md` answering the above with citations, plus a concrete "what CI needs"
list (token scopes, account setup, wrangler config) for tickets 08/09/10.

## Answer

Findings: [`../research/cloudflare-workers.md`](../research/cloudflare-workers.md). Cloudflare Workers
is a viable, free-tier e2e target; the mechanics are known.

- **ESM + subpath resolution:** wrangler bundles npm deps with its built-in esbuild, which resolves
  the `exports` map, so `hypertag` / `hypertag/parse` / `hypertag/meta` should resolve at bundle
  time. The docs don't spell out condition precedence for a third-party package, so this is
  **exactly what tier 1 proves** rather than a documented guarantee (`alias` is the escape hatch if
  a subpath ever fails). wrangler is at **v4** (4.129.x).
- **`nodejs_compat` genuinely avoidable for the library** (no `node:` builtins, native global
  `fetch`). The catch is the **harness**: `scripts/smoke.js`'s `node:assert` only works under Node
  compat, so the Workers test worker must avoid `node:` imports (assert via `throw`) unless compat
  date ≥ 2026-08-04. → **strong input to ticket 01's harness-portability decision.**
- **Ephemeral CI deploy feasible on free tier:** `workers.dev` (no zone) suffices; auth is
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, core scope **Workers Scripts:Edit**; pattern is
  `wrangler deploy --yes` → curl → `wrangler delete`. Free limits (100k req/day, 50 external
  subrequests/req) cover a deploy-invoke-teardown with one `fromUrl`.
- **Uncertainties:** the non-interactive flag for `wrangler delete` isn't documented (fall back to
  REST DELETE); exact minimal token scope confirmed only as "Workers Scripts:Edit necessary" (docs
  site was egress-blocked; facts via the docs search index).

Feeds: ticket 01 (harness must not use `node:assert` on Workers), ticket 08 (ephemeral deploy +
teardown supported), ticket 09 (`CLOUDFLARE_API_TOKEN` w/ Workers Scripts:Edit + account id).
