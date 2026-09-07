// Type definitions for the ESM sanitize entry (`import ... from 'hypertag/sanitize'`).

/** One matched tag: attribute values are strings, or `true` when valueless. */
export type Tag = Record<string, string | boolean>

export interface SanitizeOptions {
  /**
   * Entity decoder to use instead of the built-in tiny one. Pass a full decoder such as
   * `entities`' `decodeHTML` or `he`'s `decode` for complete HTML5 coverage.
   * @default the built-in decoder
   */
  decode?: (text: string) => string
}

/**
 * Clean extracted values: decode HTML entities, collapse whitespace and trim. Accepts a
 * string, a single `Tag`, or an array of `Tag`s and returns the same shape cleaned; other
 * values pass through. Recursive, so `parse()` output can be handed in directly.
 */
export declare function sanitize(value: string, options?: SanitizeOptions): string
export declare function sanitize(value: Tag, options?: SanitizeOptions): Tag
export declare function sanitize(value: Tag[], options?: SanitizeOptions): Tag[]

/**
 * Decode HTML character references with the built-in tiny decoder: numeric references (with
 * the Windows-1252 remap for 0x80-0x9F) plus a common named set. Unknown named references
 * are left verbatim.
 */
export declare function decode(text: string): string

/**
 * Resolve `url` (against `base` if relative) and strip credentials, `utm_*` tracking
 * parameters and text-fragment directives. Returns the input unchanged if not a URL.
 */
export declare function cleanUrl(url: string, base?: string): string

export default sanitize
