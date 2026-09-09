// Cloudflare Workers shim over the shared edge handler (ticket 13).
//
// A Worker's module entry exports a default object with a `fetch` method; that is the
// ONLY Cloudflare-specific glue. All real work lives in the shared, web-standard
// handler (../handler.mjs), which every provider reuses. The handler imports
// `hypertag/fetch` by its bare specifier, and wrangler's esbuild bundles the INSTALLED
// tarball at deploy time (ticket 03/04) - no `node:` builtins, so NO `nodejs_compat`.

import handler from '../handler.mjs'

export default {fetch: handler}
