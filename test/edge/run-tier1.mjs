// Tier-1 "pack + install + run" runner (ticket 03: test the PACKED TARBALL).
//
// Thin wrapper over the shared `packRun` driver (pack-run.mjs): pack the library,
// install it into a throwaway consumer, copy assert.mjs + tier1.mjs in, and run
// tier1.mjs under the requested runtime against the INSTALLED package (so the bare
// `hypertag` specifier resolves from the install, exercising the `exports` map).
// Tier-1 touches no network, so the default Deno permissions (read + env) suffice.
//
// Usage: node test/edge/run-tier1.mjs [node|bun|deno]

import {packRun} from './pack-run.mjs'

packRun({
  label: 'tier1',
  runtime: process.argv[2] || 'node',
  entry: 'tier1.mjs'
})
