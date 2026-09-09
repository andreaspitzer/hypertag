# Build: portable tier-1 harness + per-runtime runners (Node / Bun / Deno)

Type: task
Status: resolved
Blocked by:

## Question

Build the tier-1 (import + parse, no network) harness per the contract in ticket 01: one shared,
runtime-agnostic module that imports the eight package subpaths + the barrel from the **installed
packed tarball** (ticket 03), asserts the export-shape contract (barrel named-only, colliding helpers
off it) and runs parse / stripComments / metadata / favicon plus a **stubbed** `fromUrl`, using a
plain throwing assert (**never `node:assert`**, so it runs on Workers too – ticket 04). Add thin
per-runtime runners for Node, Bun and Deno.

No secrets; buildable now. Module resolution per tickets 04–07 (all confirm the subpath `exports`
map). Feeds the CI runtime matrix (ticket 15).

Done = the shared module + three runners run green locally against the packed tarball.

## Answer

Done (commit `f85ac49`). Tier-1 harness under `test/edge/`:

- `assert.mjs` – runtime-agnostic throwing asserts (`ok` / `equal` (Object.is) / `deepEqual`
  (structural), `AssertionError`); no `node:assert`, so it runs on Workers/Vercel later.
- `tier1.mjs` – shared runtime-agnostic module importing the 8 package subpaths + the barrel from the
  **installed tarball**; asserts the same export-shape contract as `scripts/smoke.js` (parse default +
  named; meta default + named; barrel named-only, curated names present, colliding helpers absent),
  then runs parse / stripComments / metadata / favicon / oembedEndpoint + a **stubbed** `fromUrl`.
  Exports `async runTier1()` and is directly runnable.
- `run-tier1.mjs` – pack + install + run driver (`npm pack` → temp consumer with a `file:` tarball dep
  → copy harness in → install → run so the bare `hypertag` specifier resolves from the install),
  parameterized `node|bun|deno`.
- package.json: scripts `smoke:edge:tier1[:node|:bun|:deno]`; added an `ava` config so ava's default
  globs don't try to run the harness as tests. No library `exports`/`files`/`main`/version change, no
  deps added.

Verified here: **Node 22 green, Bun 1.3 green** against the freshly packed tarball; `biome lint` clean;
`npm test` (124 tests) + `npm run smoke` still pass. **Deno**: runner written + wired
(`--node-modules-dir=auto`) but not executed (Deno absent in this env) – CI confirms it (ticket 15).

Reuse for 12–15: `import {ok, equal, deepEqual} from '../assert.mjs'` (never `node:assert`); copy
`assert.mjs` + the shared module into each consumer/worker so the bare `hypertag` import resolves.
