// Runner for the shared-handler local validation (ticket 13). Thin wrapper over the
// shared `packRun` driver, exactly like run-tier1/run-tier2: pack the library, install
// it into a throwaway consumer, copy handler.mjs + tier2.mjs (for EXPECTED) + assert.mjs
// + handler-check.mjs in, and run handler-check.mjs under the requested runtime against
// the INSTALLED package. This proves the shared handler + `fromUrl` path without any
// deploy (the Workers leg lives in cloudflare/deploy-check.mjs).
//
// The fixture is served from a localhost node:http server inside the check; its absolute
// path is passed through the env (packRun forwards process.env to the child). The
// handler fetches that localhost URL with the runtime's native fetch, so - like tier-2 -
// it exercises a real (loopback) fetch leg.
//
// Usage: node test/edge/run-handler.mjs [node|bun]

import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {packRun} from './pack-run.mjs'

const here = dirname(fileURLToPath(import.meta.url))
process.env.EDGE_E2E_HANDLER_FIXTURE = join(here, 'fixture', 'index.html')

packRun({
  label: 'handler',
  runtime: process.argv[2] || 'node',
  entry: 'handler-check.mjs',
  // handler.mjs is the artifact under test; tier2.mjs is imported for its EXPECTED table.
  copy: ['handler.mjs', 'tier2.mjs']
})
