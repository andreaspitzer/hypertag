// Type definitions for the CommonJS fetch entry (`require('hypertag/fetch')`).

export = fromUrl

/**
 * Fetch `url` with the runtime's native fetch (or `options.fetch`) and extract its metadata
 * card. This is the one layer that touches the network; every other entry point takes HTML you
 * already have.
 *
 * The body is read as UTF-8 and no SSRF policy is applied - pass a custom `fetch` when you need
 * non-UTF-8 decoding or target validation. Any option other than `fetch` and `rules` passes
 * through to fetch as request init (headers, signal, method, ...).
 */
declare function fromUrl(url: string, options?: fromUrl.Options): Promise<fromUrl.Metadata>

declare namespace fromUrl {
  /** The extracted fields, as returned by `metadata()`. A field with no source is `null`. */
  type Metadata = Record<string, string | null>

  /** A metadata rules table (see `hypertag/meta`). */
  type Rules = Record<string, Record<string, readonly unknown[]>>

  /** A minimal structural type for the fetch responses this layer reads. */
  interface FetchResponse {
    text(): Promise<string>
    url?: string
  }

  interface Options {
    /** Fetch implementation to use instead of the global `fetch`. */
    fetch?: (input: string, init?: unknown) => Promise<FetchResponse>
    /** A custom metadata rules table forwarded to `metadata()`. */
    rules?: Rules
    /** Any other option passes through to fetch as request init (headers, signal, method, ...). */
    [option: string]: unknown
  }

  /** Alias of the default export. */
  function fromUrl(url: string, options?: Options): Promise<Metadata>
}
