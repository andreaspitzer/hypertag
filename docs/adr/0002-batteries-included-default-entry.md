# 0002 – Batteries-included default entry, granular layers opt-in

- Status: Accepted (implemented 2026-09-08)
- Date: 2026-09-08

## Context

ADR-0001 organized hypertag as strictly layered, opt-in utility packages exposed as subpath
exports, with the top-level `hypertag` being layer 0 (the bare tag parser) and every capability
above it (`/select`, `/sanitize`, `/ld`, `/meta`, `/fetch`, `/oembed`) its own import. That ADR
justified the **layering** but silently equated it with the **packaging**: it never weighed a
single-entry + tree-shaking alternative, and it never named the 2026 ecosystem reality. Three facts
reopen the packaging question (not the layering):

1. **The whole library is tiny.** Everything imported is on the order of ~6-7 kB gzipped (the
   `fetch` layer already contains the full extraction stack at 5.5 kB; `oembed`'s registry adds
   ~1.5). Splitting seven ways so a consumer can shave a couple of kB optimizes a rounding error.
2. **The default is backwards for the common case.** `hypertag` currently resolves to the *bare
   parser* – the least-used surface – so the primary "give it a URL, get a card" user has to know
   to import `hypertag/fetch`. The convenient name points at the inconvenient thing.
3. **The audience is ESM.** hypertag targets edge runtimes (Workers, Deno, Bun, Vercel Edge) and
   modern Node, all ESM. Node 22.12+ `require(esm)` covers the rare CJS consumer (hypertag has no
   top-level await, so it qualifies). The dual CJS build is maintenance for a consumer profile that
   is largely not hypertag's.

## Decision

Invert the default and go ESM-only. The internal layering (ADR-0001 rules 1-3) is unchanged; only
the public exposure changes.

1. **`hypertag` becomes the batteries-included convenience entry** – a *curated* barrel re-exporting
   the whole public API (`parse`, `metadata`, `fromUrl`, `extract`, `select`, `sanitize`,
   `oembedEndpoint`, the `meta` source-helpers, …). The common case is now
   `import { fromUrl, metadata } from 'hypertag'`; tree-shaking (ESM + `sideEffects:false`) trims
   what an importer does not use.
2. **The bare parser moves to `hypertag/parse`** – the ~1 kB primitive, kept its own entry because
   that is the one case where the size ratio (1 vs ~7 kB) and the "tiny primitive" identity genuinely
   matter, and where a weaker bundler shaking the barrel might under-deliver.
3. **The granular layers stay as subpaths** (`hypertag/select`, `/sanitize`, `/ld`, `/meta`,
   `/fetch`, `/oembed`) for consumers who want a specific mid-size footprint or the honest
   single-layer boundary. They are the opt-in *minimization* path; `hypertag` is the opt-in-to-
   *everything* path.
4. **ESM-only.** Drop the dual CJS build; ship ESM + types only.

## Consequences

**Positive**

- The convenient name points at the convenient thing: the batteries-included card is
  `import … from 'hypertag'`. The README's lead example drops from `hypertag/fetch` to `hypertag`.
- The size-conscious paths stay exact and guaranteed (`hypertag/parser` = ~1 kB; each layer its
  measured size), not tree-shaking-dependent.
- Packaging shrinks: one build (ESM), one type set, a smaller `exports` / `files` map (no more
  `.js`+`.mjs` / `.d.ts`+`.d.mts` duplication per entry).

**Costs / wrinkles**

- **The everything-entry needs a curated public API, not a blind `export *`.** Flattening every
  layer's named exports collides: `pick` (select's value-pick vs ld's graph-pick), `ld` (a `meta`
  source-helper *and* the ld layer's function), `meta` (a source-helper). The barrel must choose the
  top-level names deliberately and expose the colliding helpers under a namespace or only from their
  subpath. This is the main implementation task.
- ESM-only excludes toolchains that still cannot consume ESM and pre-22.12 Node `require`. Acceptable
  given the audience, and free of back-compat cost while unpublished.
- Breaking vs the current 0.1.0 shape (`hypertag` was the parser). No published users, so free.

## Relationship to ADR-0001

This supersedes ADR-0001's *packaging expression* (the "top-level `hypertag` == layer 0, one subpath
per layer" mapping) while preserving its **architecture** (the honest, downward-only layers).
ADR-0001's layer table stands as the internal design; the public entry map is now: `hypertag` (all)
· `hypertag/parse` (core) · the six layer subpaths.

## Alternatives considered

- **Single entry, everything named-exported, no granular subpaths.** Rejected: loses the
  guaranteed-tiny parser path for weaker bundlers / no-bundler runtimes, for no real gain over
  keeping the subpaths available alongside the convenience barrel.
- **Keep the current seven, `hypertag` = core.** Rejected: fragments a ~7 kB library and points the
  convenient name at the least-used surface.
- **Keep dual CJS + ESM.** Rejected for the audience; Node 22.12+ `require(esm)` covers the
  stragglers, and the package is unpublished so there is no compatibility debt to protect.

## Implementation (2026-09-08)

Shipped. ESM-only, `"type": "module"`, one `.js` + one `.d.ts` per entry. Internal layering
unchanged; each layer converted from CJS to native ESM with the same export surface. The core moved
to `parse.js` (`hypertag/parse`); `index.js` is the curated barrel exporting `parse, parseAttrs,
stripComments, extend, select, sanitize, decode, cleanUrl, ld, asName, asUrl, metadata, extract,
rules, favicon, favicons, fromUrl, oembed, oembedEndpoint, providers` (named-only, no default; the
colliding `meta`/`ld` source-helpers and `pick`/`compile` stay on their subpaths / function objects).
`npm test` (124 tests, 100% coverage) and `npm run smoke` pass; lint clean.

Measured gzipped footprint (esbuild `--bundle --minify`, esm, node built-ins + `canvas` external):
`hypertag` (barrel) **6.6 kB** · `hypertag/parse` **0.65 kB** · `hypertag/ld` 0.88 · `hypertag/sanitize`
1.39 · `hypertag/oembed` 1.40 · `hypertag/select` 1.93 · `hypertag/meta` 4.93 · `hypertag/fetch` 5.11.
All smaller than the pre-change dual-build sizes (the CJS boilerplate is gone).

Follow-up: the `benchmark/` scripts still `import parse from 'hypertag'` (now the barrel, which has no
default export) and must be updated to `hypertag/parse`; `benchmark/edge-libs` size figures should be
refreshed to the ESM numbers above so `npm run bench` stays reproducible.
