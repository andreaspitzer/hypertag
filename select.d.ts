// Type definitions for the CommonJS selector entry (`require('hypertag/select')`).

export = select

/**
 * Compile the CSS-like `selector` and run it against `source`.
 * Equivalent to `select.compile(selector, options)(source)`.
 *
 * `select(html, 'link[rel=alternate]')` returns the same tags as
 * `parse(html, 'link').filter(({rel}) => rel === 'alternate')`.
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
     * @default '<'
     */
    tagKey?: string
  }

  /**
   * One matched tag: its attributes plus the tag name under `tagKey`.
   * An attribute value is its string value, or `true` when valueless.
   */
  type Tag = Record<string, string | boolean>

  /** Alias of the default export (`require('hypertag/select').select`). */
  function select(source: string, selector: string, options?: ParseOptions): Tag[]

  /**
   * Compile `selector` once into a reusable parser, mirroring `extend`.
   * `compile('link[rel=alternate]')` is `source => parse(source, 'link').filter(...)`.
   */
  function compile(selector: string, options?: ParseOptions): (source: string) => Tag[]
}
