// Type definitions for the CommonJS metadata entry (`require('hypertag/meta')`).

export = metadata

/**
 * Extract metadata from `source` using the default rules. `url` is the page URL, used as the base
 * for resolving relative URL fields. `options.rules` runs the pure engine with your own rules
 * instead; `options.oembed` also adds the page's oEmbed discovery URL (off by default).
 */
declare function metadata(source: string, url?: string, options?: metadata.Options): metadata.Metadata

declare namespace metadata {
  /** Options for the default-card entry point. */
  interface Options {
    /** Run the pure engine with these rules instead of the default card (no icon/domain/... ). */
    rules?: Rules
    /** Also extract the page's oEmbed discovery endpoint into `oembedUrl` (fetches nothing). Off by default. */
    oembedDiscovery?: boolean
  }

  /** The extracted fields. A field with no matching source is `null`. */
  type Metadata = Record<string, string | null>

  /** How a field's winning value is cleaned: decode+collapse text, resolve+clean a url, or leave raw. */
  type Normalizer = 'text' | 'url' | 'raw'

  /** An opaque source marker produced by `meta`/`link`/`content`/`ld`/`ldName`/`ldUrl`. */
  interface Source {
    readonly [key: string]: unknown
  }

  /** A field rule: exactly one normalizer key mapping to an ordered list of sources. */
  type FieldRule = {[K in Normalizer]?: Source[]}

  /** A rules table: field name → field rule. */
  type Rules = Record<string, FieldRule>

  /** Alias of the default export. */
  function metadata(source: string, url?: string, options?: Options): Metadata

  /** The engine: extract with an explicit rules table. */
  function extract(source: string, url: string | undefined, rules: Rules): Metadata
  namespace extract {
    /** Compile a rules table once into a reusable extractor, mirroring `select.compile`. */
    function compile(rules: Rules): (source: string, url?: string) => Metadata
  }

  /** A meta value under `property` OR `name` (interchangeable in practice), read from `content`. */
  function meta(...keys: string[]): Source
  /** A link's `href` by `rel` word. */
  function link(...rels: string[]): Source
  /** An element's text content (e.g. `content('title')`). */
  function content(...tags: string[]): Source
  /** Any attribute of a matched tag, e.g. `attr('html', 'lang')` reads `<html lang>`. */
  function attr(selector: string, attribute: string): Source
  /** A JSON-LD value for any of `keys`. */
  function ld(...keys: string[]): Source
  /** A JSON-LD value, coerced from a person/organization shape to a name. */
  function ldName(...keys: string[]): Source
  /** A JSON-LD value, coerced from an image/URL shape to a URL. */
  function ldUrl(...keys: string[]): Source

  /** One declared favicon, resolved against the page URL. */
  interface Icon {
    url: string
    rel: string
    sizes: string
    type: string
  }

  /**
   * Every `<link rel*=icon>` the page declares, resolved against `url` and ranked best-first
   * (SVG / `sizes="any"`, then largest raster, then apple-touch-icon). Monochrome `mask-icon`
   * and hrefless links are dropped.
   */
  function favicons(source: string, url?: string): Icon[]

  /**
   * The single best favicon URL, falling back to `/favicon.ico` at the origin when the page
   * declares none, or `null` when there is nothing and no `url` to resolve against.
   */
  function favicon(source: string, url?: string): string | null

  /** The default (overridable) rules table. */
  const rules: Rules
}
