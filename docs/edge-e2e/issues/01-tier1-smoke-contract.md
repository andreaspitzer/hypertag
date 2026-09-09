# Tier-1 smoke contract: what to assert, and via which import surface

Type: grilling
Status: resolved

## Question

Settle the **tier-1** contract – the cheap import + parse check that must pass on every runtime
(Node, Bun, Deno, Cloudflare Workers, Vercel Edge) – before any runtime harness is written.

Decide:

1. **Import surface.** The existing `scripts/smoke.js` imports **relative source paths**
   (`../parse.js`, `../meta.js`, `../index.js`). A real consumer imports the **package subpaths**
   (`hypertag/parse`, `hypertag/meta`, `hypertag`, …). Tier 1's whole point is catching ESM-only /
   subpath-export / bundling breakage, which only the package-subpath form exercises. Do we rewrite
   the harness to import via package specifiers (and how does each runtime resolve them – npm
   install, `npm:` specifier, bundler)? This dovetails with ticket 03 (version under test).
2. **Which entry points must load.** The barrel `hypertag`, plus which subpaths – all eight, or the
   consumer-facing set (`parse`, `meta`, `fetch`, `oembed`, `select`)? `scripts/smoke.js` already
   encodes a precise export-shape contract (barrel is named-only, no default; the colliding
   `meta`/`link`/`content` helpers must *not* be on the barrel) – reuse that as the assertion set?
3. **What to assert beyond "it imported".** `scripts/smoke.js` runs `parse()`, `stripComments()`,
   `metadata()`, `favicon()`, and a **stubbed** `fromUrl` (fake `fetch`). For tier 1, keep the
   stubbed-`fromUrl` assertion (proves the code path loads without touching the network), or leave
   all real-network exercise to tier 2 (ticket 02)?
4. **One shared harness or per-runtime files.** A single runtime-agnostic assertion module the
   runners import, versus a hand-written file per runtime. Affects how much each provider ticket
   duplicates.

Output: a written tier-1 contract (import surface, entry-point set, assertion list, harness shape)
that tickets 04–07 and the graduated harness tickets build against. Ground it in the shipped
`scripts/smoke.js` and the ESM/subpath facts in the map's Notes.

## Answer

The tier-1 contract, built on the packed-tarball decision (03):

1. **Import surface: package subpaths only**, resolved against the installed tarball –
   `hypertag` (barrel), `hypertag/parse`, `hypertag/meta`, `hypertag/fetch`, `hypertag/oembed`,
   `hypertag/select`, `hypertag/sanitize`, `hypertag/ld`. This is the whole point of tier 1:
   relative source paths would not exercise the `exports` map / ESM-only / bundling surface.
2. **Entry points asserted: all eight subpaths + the barrel must load**, and the **export-shape
   contract from `scripts/smoke.js` is reused**: the barrel is named-only (no default), and the
   colliding helpers (`pick`, and the `meta`/`link`/`content` source helpers) are **not** on the
   barrel, only on their own subpaths. Asserting all eight is cheap and gives fullest exports-map
   coverage.
3. **Assertions beyond "it imported":** keep a functional smoke that proves the code paths load –
   `parse()` returns the expected tags, `stripComments()`, `metadata(html, url)` returns a card with
   the expected fields, `favicon()` ranks – plus the **stubbed `fromUrl`** (a fake injected `fetch`)
   to prove the fetch-layer module loads without touching the network. All real-network exercise is
   tier 2 (ticket 02).
4. **Harness shape: one shared, runtime-agnostic assertion module** that every runner imports, using
   a **plain throwing assert – never `node:assert`** (the lowest common denominator: `node:assert`
   is fine on Node/Bun/Deno but not guaranteed on Workers/Vercel). Per-runtime runners are thin:
   Node/Bun/Deno execute the module as a script and exit non-zero on failure; Workers/Vercel wrap it
   in a `fetch` handler that runs the asserts per request and returns a pass/fail body the CI curls.
