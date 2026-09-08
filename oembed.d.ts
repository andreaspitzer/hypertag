// Type definitions for the CommonJS oEmbed registry entry (`require('hypertag/oembed')`).

export = oembedEndpoint

/**
 * Resolve the oEmbed endpoint URL for `url` from `list` (default: the curated popular providers),
 * ready to fetch (the target is added as `url=`, `format=json`), or `null` when no provider matches.
 *
 * Pair with `hypertag/fetch`'s `oembed()` to fetch the payload. This resolves antibot / JS-rendered
 * providers (Twitter/X, TikTok, ...) from the URL alone - the case in-page discovery cannot cover.
 */
declare function oembedEndpoint(url: string, list?: oembedEndpoint.Provider[]): string | null

declare namespace oembedEndpoint {
  /** One provider entry: an oEmbed endpoint and the URL schemes (with `*` wildcards) it serves. */
  interface Provider {
    name: string
    endpoint: string
    schemes: string[]
  }
  /** Alias of the default export. */
  function oembedEndpoint(url: string, list?: Provider[]): string | null
  /** The curated default provider registry - override or extend by passing your own `list`. */
  const providers: Provider[]
}
