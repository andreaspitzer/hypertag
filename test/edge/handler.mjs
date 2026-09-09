// The ONE shared edge handler reused by every deployed tier-2 provider (ticket 08:
// "one shared edge-handler source + thin per-provider adapter shims"). Cloudflare
// (ticket 13), Vercel (ticket 14) and Deno (ticket 16) each wrap THIS function.
//
// It is a web-standard `(Request) => Promise<Response>`: no `node:*`, no framework,
// nothing platform-specific, so the three shims are one line each -
//   Cloudflare: export default {fetch: handler}
//   Vercel:     export default handler
//   Deno:       Deno.serve(handler)
//
// Contract:
//   - reads the `url` query param from the request URL,
//   - calls `fromUrl(that url)` - the fetch layer, imported by its BARE specifier so
//     the deployed worker bundles the real INSTALLED tarball (ticket 03), exactly as
//     tier-1/tier-2 do,
//   - returns the resulting card as `application/json` (HTTP 200).
// The two non-happy paths return a non-200 JSON body: a missing/blank `url` param is
// 400, and a thrown fetch/parse error is 502 (`fromUrl` itself never throws on a
// broken *page* - it returns an all-null card - so a 502 means the request setup or
// the network leg failed, per the fetch layer's documented boundary).

import fromUrl from 'hypertag/fetch'

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json; charset=utf-8'}
  })

export async function handler(request) {
  let target
  try {
    target = new URL(request.url).searchParams.get('url')
  } catch {
    return json({error: 'invalid request url'}, 400)
  }

  if (!target) {
    return json({error: "missing required 'url' query param"}, 400)
  }

  try {
    const card = await fromUrl(target)
    return json(card, 200)
  } catch (err) {
    return json({error: `fromUrl failed: ${err?.message ?? err}`}, 502)
  }
}

export default handler
