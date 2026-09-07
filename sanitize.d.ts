// Type definitions for the CommonJS sanitize entry (`require('hypertag/sanitize')`).

export = sanitize

/**
 * Clean extracted values: decode HTML entities, collapse whitespace and trim. Accepts a
 * string, a single `Tag`, or an array of `Tag`s and returns the same shape cleaned; other
 * values pass through. Recursive, so `parse()` output can be handed in directly.
 */
declare function sanitize(value: string, options?: sanitize.SanitizeOptions): string
declare function sanitize(value: sanitize.Tag, options?: sanitize.SanitizeOptions): sanitize.Tag
declare function sanitize(value: sanitize.Tag[], options?: sanitize.SanitizeOptions): sanitize.Tag[]

declare namespace sanitize {
  /** One matched tag: attribute values are strings, or `true` when valueless. */
  type Tag = Record<string, string | boolean>

  interface SanitizeOptions {
    /**
     * Entity decoder to use instead of the built-in tiny one. Pass a full decoder such as
     * `require('entities').decodeHTML` or `require('he').decode` for complete HTML5 coverage.
     * @default the built-in decoder
     */
    decode?: (text: string) => string
  }

  /** Alias of the default export (`require('hypertag/sanitize').sanitize`). */
  function sanitize(value: string, options?: SanitizeOptions): string
  function sanitize(value: Tag, options?: SanitizeOptions): Tag
  function sanitize(value: Tag[], options?: SanitizeOptions): Tag[]

  /**
   * Decode HTML character references with the built-in tiny decoder: numeric references
   * (with the Windows-1252 remap for 0x80-0x9F) plus a common named set. Unknown named
   * references are left verbatim.
   */
  function decode(text: string): string

  /**
   * Resolve `url` (against `base` if relative) and strip credentials, `utm_*` tracking
   * parameters and text-fragment directives. Returns the input unchanged if not a URL.
   */
  function cleanUrl(url: string, base?: string): string
}
