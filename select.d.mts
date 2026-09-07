// Type definitions for the ESM selector entry (`import ... from 'hypertag/select'`).

export interface ParseOptions {
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
export type Tag = Record<string, string | boolean>

/**
 * Compile the CSS-like `selector` and run it against `source`.
 * Equivalent to `compile(selector, options)(source)`.
 *
 * `select(html, 'link[rel=alternate]')` returns the same tags as
 * `parse(html, 'link').filter(({rel}) => rel === 'alternate')`.
 */
export declare function select(
  source: string,
  selector: string,
  options?: ParseOptions
): Tag[]

/**
 * Compile `selector` once into a reusable parser, mirroring `extend`.
 * `compile('link[rel=alternate]')` is `source => parse(source, 'link').filter(...)`.
 */
export declare function compile(
  selector: string,
  options?: ParseOptions
): (source: string) => Tag[]

export declare namespace select {
  export {compile}
}

export default select
