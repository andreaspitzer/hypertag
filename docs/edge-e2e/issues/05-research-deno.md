# Research: Deno + Deno Deploy – local run, CI deploy, npm: resolution, native fetch

Type: research
Status: open

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
