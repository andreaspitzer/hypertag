// Vercel Edge Function shim over the shared edge handler (tickets 08 + 14).
//
// A non-framework Vercel `/api` function: the default export IS the request handler and
// `export const config = {runtime: 'edge'}` selects the V8-isolate Edge runtime (ticket
// 06 - this is the correct spelling for a bare `/api` function; `export const runtime`
// is Next.js-only). That `config` export is the ONLY Vercel-specific glue; all real work
// lives in the shared, web-standard handler (../handler.mjs) that every provider reuses
//   Cloudflare: export default {fetch: handler}
//   Vercel:     export default handler + export const config = {runtime: 'edge'}
//   Deno:       Deno.serve(handler)
//
// The handler imports `hypertag/fetch` by its BARE specifier, and Vercel's `vercel build`
// bundles the INSTALLED tarball (ticket 03) exactly as tier-1/tier-2's installs do - no
// `node:` builtins, so it runs on the edge runtime unchanged. Deployed at
// `<preview>/api/edge-e2e`; invoke as `?url=<page-to-unfurl>`.

import handler from '../handler.mjs'

export default handler

export const config = {runtime: 'edge'}
