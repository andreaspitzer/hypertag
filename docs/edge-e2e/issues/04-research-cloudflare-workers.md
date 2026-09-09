# Research: Cloudflare Workers – CI deploy, ESM/subpath resolution, native fetch, free tier

Type: research
Status: claimed

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
