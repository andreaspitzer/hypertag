// hypertag/fetch - the one opt-in layer that touches the network. Every other entry point
// takes HTML you already have; this is a thin convenience wrapper so the common "URL in, card
// out" job is a single call. It fetches `url` with the runtime's native fetch (present on
// Node 18+, Deno, Bun and edge runtimes) and hands the HTML to metadata(). Zero dependencies.
//
//   const card = await fromUrl('https://example.com/article')   // one call, the whole card
//
// Deliberately thin, and honest about what it does NOT do:
//   - Encoding: the body is read as UTF-8 via res.text(). A page that declares a non-UTF-8
//     charset needs a decoding step this layer does not perform - pass a `fetch` that returns
//     correctly-decoded text for those pages.
//   - SSRF: fetching a caller-supplied URL can reach internal services. If `url` is untrusted,
//     pass a `fetch` that validates the target (block private ranges, cap redirects). This
//     layer applies no such policy, by design.
// Everything is pluggable through `options`: `fetch` swaps the fetch implementation, `rules`
// forwards a custom metadata rules table, and any other option (headers, signal, method, ...)
// passes straight through to fetch as request init.

const metadata = require('./meta.js')

module.exports = fromUrl
Object.assign(module.exports, {fromUrl, oembed})

async function fromUrl(url, options = {}) {
  const {fetch = globalThis.fetch, rules, oembedDiscovery, ...init} = options
  if (typeof fetch !== 'function') {
    throw new TypeError('hypertag/fetch: no fetch available - pass options.fetch')
  }
  const response = await fetch(url, {redirect: 'follow', ...init})
  // `|| ''` guards a custom fetch whose text() yields a non-string; the core would otherwise
  // throw on it. An empty body then yields an all-null card rather than an exception, matching
  // the parser's "malformed input -> fewer results, never throws" contract.
  const html = (await response.text()) || ''
  return metadata(html, response.url || url, {rules, oembedDiscovery})
}

// Fetch and parse an oEmbed endpoint - the URL a page advertises via <link rel oembed>, exposed
// as the `oembed` field on the metadata card - and return the provider's oEmbed JSON payload.
// Same pluggability as fromUrl. Discovery (the endpoint URL) is free extraction; this is the one
// opt-in round-trip that gets the rich embed. Providers that do NOT self-advertise (some social
// SPAs) are out of scope here - resolve their endpoint yourself and pass it in.
async function oembed(endpoint, options = {}) {
  const {fetch = globalThis.fetch, ...init} = options
  if (typeof fetch !== 'function') {
    throw new TypeError('hypertag/fetch: no fetch available - pass options.fetch')
  }
  const response = await fetch(endpoint, {redirect: 'follow', headers: {accept: 'application/json'}, ...init})
  return response.json()
}
