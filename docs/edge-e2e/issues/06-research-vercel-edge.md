# Research: Vercel Edge – CI deploy, edge runtime resolution, native fetch, free tier

Type: research
Status: open

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
