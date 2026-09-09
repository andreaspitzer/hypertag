// Type definitions for the ESM oEmbed registry entry (`import ... from 'hypertag/oembed'`).

/** One provider entry: an oEmbed endpoint and the URL schemes (with `*` wildcards) it serves. */
export interface Provider {
  name: string
  endpoint: string
  schemes: string[]
}

/**
 * Resolve the oEmbed endpoint URL for `url` from `list` (default: the curated popular providers),
 * ready to fetch (the target is added as `url=`, `format=json`), or `null` when none matches. Pair
 * with `hypertag/fetch`'s `oembed()` to fetch the payload.
 */
export declare function oembedEndpoint(url: string, list?: Provider[]): string | null

/** The curated default provider registry - override or extend by passing your own `list`. */
export declare const providers: Provider[]

export default oembedEndpoint
