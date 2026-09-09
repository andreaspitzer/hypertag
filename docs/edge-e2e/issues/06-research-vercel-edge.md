# Research: Vercel Edge – CI deploy, edge runtime resolution, native fetch, free tier

Type: research
Status: resolved

## Question

Surface the facts a Vercel Edge e2e job depends on. Findings land in
[`../research/vercel-edge.md`](../research/vercel-edge.md); resolve with a gist + link into
Decisions-so-far.

Investigate (primary sources – Vercel docs):

1. **Deploy from CI, non-interactively.** The `vercel` CLI deploy flow, `VERCEL_TOKEN` (+ org/project
   id) auth, and whether a **preview deployment** per CI run (ephemeral, unique URL) is the natural
   fit vs a production deploy. What minimal project scaffolding a single edge function needs.
2. **The Edge Runtime, precisely.** Vercel Edge Functions run on a **web-standard / V8 isolate**
   runtime (not Node) – confirm how an npm dependency is bundled for it, whether **ESM-only +
   subpath exports** resolve, and whether any Node built-in usage would be rejected (again: the
   library vs the test harness – keep `node:` out of the edge handler).
3. **Outbound `fetch`** from an edge function to an arbitrary external URL (tier 2), and any limits.
4. **Free-tier / Hobby feasibility** for CI deploy + invoke, and what must pre-exist in the account
   (feeds ticket 09). Note any auth-protection-on-preview-deployments gotcha that would block CI
   from curling the preview URL.

Output: `vercel-edge.md` with citations, plus the "what CI needs" list (token, org/project ids,
project config) for tickets 08/09/10.

## Answer

Findings: [`../research/vercel-edge.md`](../research/vercel-edge.md). Vercel Edge is a feasible
free-tier (Hobby) target; one real blocker (preview-URL protection) and one ticket correction.

- **ESM on the edge runtime:** the runtime is a V8 isolate (not Node); docs confirm `node_modules`
  resolve "as long as they implement ES Modules and do not use native Node.js APIs" (`require`
  rejected, `eval`/`Function` throw) – hypertag's ESM-only, zero-dep, `node:`-free layers fit.
  `exports` subpath resolution isn't spelled out, so tier 1 **proves it empirically**.
- **Ephemeral preview deploy on Hobby:** `vercel deploy --yes` with `VERCEL_TOKEN` + `VERCEL_ORG_ID`
  + `VERCEL_PROJECT_ID` deploys non-interactively and prints the unique preview URL. Gotcha: a new
  project's **first** deploy is always production; later non-`--prod` deploys are previews → **pre-create
  the project**.
- **Preview-URL protection is the real blocker:** on Hobby, Vercel Authentication (Standard
  Protection) guards preview URLs, so a plain CI `curl` hits a login challenge. Fix = **Protection
  Bypass for Automation** (all plans): `x-vercel-protection-bypass: <secret>` header/query, or
  `vercel curl`. → a secret ticket 09 must provision.
- **Ticket correction:** for a non-framework `/api` function use `export const config = { runtime:
  'edge' }` + `"type":"module"` – the bare `export const runtime = 'edge'` in this ticket's text is
  Next.js-only (and unsupported since Next 16.3).
- **Uncertainties:** subpath resolution, default-on protection, an undocumented outbound-fetch cap,
  Hobby non-commercial fair-use, and Vercel's general edge→Node de-emphasis.

Feeds: ticket 01 (subpath proof), ticket 08 (preview deploy model + protection bypass in the assert
step), ticket 09 (`VERCEL_TOKEN` + org/project ids + protection-bypass secret; pre-create project).
