// Type definitions for the CommonJS JSON-LD entry (`require('hypertag/ld')`).

export = ld

/**
 * Parse and flatten every JSON-LD block on the page (and each block's `@graph`) into one list
 * of objects. Invalid or non-object blocks contribute nothing.
 */
declare function ld(source: string): ld.LdObject[]

declare namespace ld {
  /** One parsed JSON-LD object. Values are dynamic, so untyped. */
  type LdObject = Record<string, unknown>

  /** Alias of the default export. */
  function ld(source: string): LdObject[]

  /**
   * First present value in `graph` for any of `keys`, scanning objects then keys in order.
   * `undefined` if no object carries any of the keys.
   */
  function pick(graph: LdObject[], ...keys: string[]): unknown

  /** Coerce a person/organization shape (string, `{name}`, or array) down to a name. */
  function asName(value: unknown): unknown

  /** Coerce an image/URL shape (string, `{url}`/`{contentUrl}`, or array) down to a URL. */
  function asUrl(value: unknown): unknown
}
