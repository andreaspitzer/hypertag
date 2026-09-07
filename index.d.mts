// Type definitions for the ESM entry (`import ... from 'hypertag'`).

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
 * Parse `source` and return an attribute map for every occurrence of the given
 * tag(s). Pass `'*'` to match every tag.
 */
export declare function parse(
  source: string,
  tags: string | string[],
  options?: ParseOptions
): Tag[]

/**
 * Parse a single HTML tag's text into an attribute map.
 * Returns `undefined` when the input is not a tag.
 */
export declare function parseAttrs(htmlTagText: string, tagKey?: string): Tag | undefined

/** Remove HTML comments (`<!-- ... -->`) from a string. */
export declare function stripComments(html: string): string

/** Create a parser pre-bound to `tags` and `options`. */
export declare function extend(
  tags: string | string[],
  options?: ParseOptions
): (source: string) => Tag[]

export default parse
