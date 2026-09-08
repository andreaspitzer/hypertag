// Type definitions for the CommonJS selector entry (`require('hypertag/select')`).

export = select

/**
 * Compile the CSS-like `selector` and run it against `source`.
 * Equivalent to `select.compile(selector, options)(source)`.
 *
 * Attribute name and value matching are case-insensitive by default (so
 * `meta[property=og:title]` also matches `<meta property="OG:Title">`); append the CSS
 * Level 4 `s` flag to a clause to force case-sensitive matching (`[href=Logo.PNG s]`).
 *
 * A comma-separated selector list unions its groups
 * (`link[rel=canonical], meta[property^=og:]`): an element is kept when it satisfies any one
 * whole group (that group's tag AND its conditions). Results are in document order, each
 * element once.
 */
declare function select(
  source: string,
  selector: string,
  options?: select.ParseOptions
): select.Tag[]

declare namespace select {
  interface ParseOptions {
    /**
     * Key under which the matched tag name is stored on each result object.
     * @default '$tag'
     */
    tagKey?: string
    /**
     * Also capture each element's content, up to its close tag, under `contentKey`.
     * @default false
     */
    content?: boolean
    /**
     * Key under which element content is stored when `content` is enabled.
     * @default '$content'
     */
    contentKey?: string
  }

  /**
   * One matched tag: its attributes plus the tag name under `tagKey`.
   * An attribute value is its string value, or `true` when valueless.
   */
  type Tag = Record<string, string | boolean>

  /** A pre-baked selector: run it against `source`, get the matching tags back. */
  type Preset = (source: string) => Tag[]

  /**
   * One `pick` source: a selector string (read `options.attr`), or a `[selector, attr]`
   * tuple (read `attr`; a source with no attribute yields the matched tag).
   */
  type PickSource = string | [selector: string, attr: string]

  interface PickOptions extends ParseOptions {
    /** Default attribute to read for bare-string sources. */
    attr?: string
  }

  /** Alias of the default export (`require('hypertag/select').select`). */
  function select(source: string, selector: string, options?: ParseOptions): Tag[]

  /**
   * Compile `selector` once into a reusable parser, mirroring `extend`.
   * `compile('link[rel=alternate]')` is `source => parse(source, 'link').filter(...)`.
   * Accepts a comma-separated selector list, which unions its groups.
   */
  function compile(selector: string, options?: ParseOptions): (source: string) => Tag[]

  /**
   * The first usable value across `sources`, in preference order. A source is skipped when
   * it matches no tag, or its attribute is absent, `null`, or empty - so blanks fall
   * through. A source with no attribute yields the matched `Tag`. Returns `undefined` if
   * nothing matches.
   */
  function pick(source: string, sources: PickSource[], options?: PickOptions): string | Tag | undefined
  namespace pick {
    /** Compile the sources once into a reusable picker, mirroring `compile`. */
    function compile(sources: PickSource[], options?: PickOptions): (source: string) => string | Tag | undefined
  }

  /** OpenGraph meta tags: `meta[property^=og:]`. */
  const og: Preset
  /** Twitter Card meta tags: `meta[name^=twitter:]`. */
  const twitter: Preset
  /** Icon links: `link[rel*=icon]` (icon, shortcut icon, apple-touch-icon, mask-icon). */
  const icons: Preset
  /** Canonical link: `link[rel=canonical]`. */
  const canonical: Preset
  /** Stylesheet links: `link[rel~=stylesheet]`. */
  const stylesheets: Preset
  /** Alternate links (hreflang, feeds): `link[rel~=alternate]`. */
  const alternates: Preset
  /** The `<title>` element with its text under the content key (`$content`). */
  const title: Preset
  /** JSON-LD blocks: `script[type*=ld+json]` with each body under the content key (`$content`), ready to JSON.parse. */
  const jsonld: Preset
}
