// Type definitions for hypertag
// The fastest HTML tag and attributes parser.
// Published as CommonJS: `const parse = require('hypertag')`.

export = parse

/**
 * Parse `source` and return an attribute map for every occurrence of the given
 * tag(s). Pass `'*'` to match every tag.
 */
declare function parse(
  source: string,
  tags: string | string[],
  options?: parse.ParseOptions
): parse.Tag[]

declare namespace parse {
  interface ParseOptions {
    /**
     * Key under which the matched tag name is stored on each result object.
     * @default '<'
     */
    tagKey?: string
    /**
     * Also capture each element's content, up to its matching close tag, under `contentKey`.
     * Reliable for raw-text (`script`, `style`) and escapable-raw-text (`title`, `textarea`)
     * elements; best-effort (first close tag) for elements that can nest. Unclosed elements
     * are skipped. Runs on the raw source, so commented-out elements may be matched.
     * @default false
     */
    content?: boolean
    /**
     * Key under which element content is stored when `content` is enabled.
     * @default '>'
     */
    contentKey?: string
  }

  /**
   * One matched tag: its attributes plus the tag name under `tagKey`.
   * An attribute value is its string value, or `true` when valueless.
   */
  type Tag = Record<string, string | boolean>

  /** Alias of the default export (`require('hypertag').parse`). */
  function parse(source: string, tags: string | string[], options?: ParseOptions): Tag[]

  /**
   * Parse a single HTML tag's text into an attribute map.
   * Returns `undefined` when the input is not a tag.
   */
  function parseAttrs(htmlTagText: string, tagKey?: string): Tag | undefined

  /** Remove HTML comments (`<!-- ... -->`) from a string. */
  function stripComments(html: string): string

  /** Create a parser pre-bound to `tags` and `options`. */
  function extend(
    tags: string | string[],
    options?: ParseOptions
  ): (source: string) => Tag[]
}
