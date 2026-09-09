// Type definitions for the ESM fetch entry (`import ... from 'hypertag/fetch'`).

/** The extracted fields, as returned by `metadata()`. A field with no source is `null`. */
export type Metadata = Record<string, string | null>

/** A metadata rules table (see `hypertag/meta`). */
export type Rules = Record<string, Record<string, readonly unknown[]>>

/** A minimal structural type for the fetch responses this layer reads. */
export interface FetchResponse {
  text(): Promise<string>
  url?: string
}

export interface Options {
  /** Fetch implementation to use instead of the global `fetch`. */
  fetch?: (input: string, init?: unknown) => Promise<FetchResponse>
  /** A custom metadata rules table forwarded to `metadata()`. */
  rules?: Rules
  /** Also add the page's oEmbed discovery endpoint (`oembedUrl`) to the card (forwarded to `metadata()`). */
  oembedDiscovery?: boolean
  /** Any other option passes through to fetch as request init (headers, signal, method, ...). */
  [option: string]: unknown
}

/**
 * Fetch `url` with the runtime's native fetch (or `options.fetch`) and extract its metadata
 * card. The one layer that touches the network; every other entry point takes HTML you already
 * have. The body is read as UTF-8 and no SSRF policy is applied - pass a custom `fetch` for
 * non-UTF-8 decoding or target validation.
 */
export declare function fromUrl(url: string, options?: Options): Promise<Metadata>

/**
 * Fetch and parse an oEmbed endpoint - the URL a page advertises via `<link rel oembed>`, exposed
 * as the `oembed` field on the metadata card - and return its JSON payload.
 */
export declare function oembed(endpoint: string, options?: Options): Promise<unknown>

export default fromUrl
