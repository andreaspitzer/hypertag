# Version under test: local source, packed tarball, or published npm package

Type: grilling
Status: resolved

## Question

Decide **which build of hypertag the e2e tests load**, because it changes what a green result
proves and how each runtime resolves the import.

The candidates:

- **Local source in the repo** (what CI has checked out). Tests the code as it is *now*, pre-release
  – catches a regression before it ships. But it imports the raw `.js` files, and each runtime must
  resolve the package's `exports` map against the working tree (e.g. `npm install .`, a file:
  dependency, or a bundler pointed at the checkout).
- **A packed tarball** (`npm pack`) installed into a throwaway consumer. Tests exactly the files
  that `files`/`exports` will publish (catches a missing-file / wrong-exports packaging bug that
  local-source testing hides), still pre-release.
- **The published npm package** (`hypertag@latest`). Tests what users actually get, but only
  *after* release – too late to block a bad publish, and couples the e2e run to npm availability.

Considerations: the tier-1 import-surface decision (01) leans on this (package subpaths only mean
something against an installed/packed package, not raw source paths); `prepublishOnly` already runs
`npm test && npm run smoke`, so there's precedent for a pre-publish gate; edge bundlers (wrangler
esbuild, Vercel, Deno's `npm:`) each resolve a dependency differently than a relative path, so "how
we make the package importable" is part of this answer per runtime.

A likely shape to react to: **packed-tarball, pre-release, in CI** as the default (proves the
publishable artifact without waiting for release), with a note on whether a post-publish smoke of
the real `hypertag@latest` is also wanted. Confirm or redirect.

Output: the chosen version-under-test + the install/resolution mechanism per runtime, feeding
tickets 04–07 and the harness tickets.

## Answer

**Chosen: the packed tarball (`npm pack`), pre-release, in CI.** A green run proves the exact
files and `exports` map that will publish, catching a missing-file / wrong-subpath packaging bug
that raw-source testing hides, while still gating *before* release (the `prepublishOnly` precedent).

**Mechanism, once per CI run:** a `pack` job runs `npm pack` → `hypertag-<version>.tgz` and uploads
it as a workflow artifact. Every runtime job downloads that one artifact and installs it into a
throwaway consumer, then imports the **package subpaths** (never relative source paths):

- **Node / Bun** – `npm install ./hypertag-*.tgz` (or `bun add ./hypertag-*.tgz`) in a temp consumer.
- **Deno** – a consumer `package.json` with the tarball as a `file:` dependency + `deno install`, so
  Deno resolves the bare/`npm:` specifier from its node_modules-backed cache (per ticket 05).
- **Cloudflare Workers** – the test worker's `package.json` depends on the tarball; `npm install`;
  `wrangler` (esbuild) bundles the subpath import (proves subpath resolution under wrangler v4).
- **Vercel Edge** – the edge-function project depends on the tarball; Vercel installs + bundles it.

**Optional add-on (not required):** a post-publish job that smokes the real `hypertag@latest` after
release, to confirm what users actually get. Deferred – the pre-release tarball gate is the core.
