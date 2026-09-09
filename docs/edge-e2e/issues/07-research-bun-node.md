# Research: Bun + Node baseline – local run in CI, ESM/subpath resolution, native fetch

Type: research
Status: open

## Question

Surface the (smaller) facts for the two **non-deploy** runtimes: Bun and Node. Both run **locally in
CI** with no account or deploy – so this is the cheapest research, but still confirms the import
surface and the tier-2 local network run. Findings land in
[`../research/bun-node.md`](../research/bun-node.md); resolve with a gist + link into
Decisions-so-far.

Investigate (primary sources – Bun / Node docs):

1. **Bun in GitHub Actions.** `oven-sh/setup-bun`, how Bun installs and resolves an **ESM-only**
   package with **subpath exports** (`hypertag/parse`, `hypertag/meta`), and the command to run the
   tier-1 harness (`bun run` / `bun test`). Any difference in how Bun honours the `exports` map vs
   Node.
2. **Node baseline.** Node already runs `npm run smoke` in CI (18–24) – confirm what, if anything,
   changes when tier 1 imports **package subpaths** (ticket 01) instead of relative source paths,
   i.e. whether a local `npm install`/`npm pack` step is needed for `hypertag/parse` to resolve.
3. **Tier-2 local network run.** Both Bun and Node have a global `fetch` – confirm a plain
   `fromUrl(liveUrl)` call works locally (no deploy) so tier 2 gets a native-`fetch` signal on these
   two runtimes for free.
4. **Harness portability constraint.** Note whether the shared tier-1 harness (ticket 01) can use
   `node:assert` on Bun/Node but must avoid it on Deno/Workers/Vercel – i.e. what the lowest common
   denominator assertion mechanism is.

Output: `bun-node.md` with citations + the "what CI needs" list for ticket 10 (these two need no
provisioning, so they don't gate ticket 09).
