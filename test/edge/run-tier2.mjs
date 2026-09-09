// Tier-2 "pack + install + run" runner (ticket 03: test the PACKED TARBALL over the
// REAL network).
//
// Thin wrapper over the shared `packRun` driver (pack-run.mjs): pack the library,
// install it into a throwaway consumer, copy assert.mjs + tier2.mjs in, and run
// tier2.mjs under the requested runtime against the INSTALLED package. tier2.mjs
// calls `fromUrl` with each runtime's NATIVE fetch against the controlled fixture,
// so Deno additionally needs --allow-net here.
//
// The fixture URL comes from tier2.mjs (EDGE_E2E_FIXTURE_URL env var, defaulting to
// the live GitHub Pages URL); the driver passes the current env through to the child,
// so `EDGE_E2E_FIXTURE_URL=... node test/edge/run-tier2.mjs <runtime>` overrides it
// (e.g. to a localhost server for local validation).
//
// Usage: node test/edge/run-tier2.mjs [node|bun|deno]

import {packRun} from './pack-run.mjs'

packRun({
  label: 'tier2',
  runtime: process.argv[2] || 'node',
  entry: 'tier2.mjs',
  // Real cross-origin fetch: Deno must be granted network access.
  denoPermissions: ['--allow-read', '--allow-env', '--allow-net']
})
