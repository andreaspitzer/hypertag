// Type definitions for the ESM JSON-LD entry (`import ... from 'hypertag/ld'`).

/** One parsed JSON-LD object. Values are dynamic, so untyped. */
export type LdObject = Record<string, unknown>

/**
 * Parse and flatten every JSON-LD block on the page (and each block's `@graph`) into one list
 * of objects. Invalid or non-object blocks contribute nothing.
 */
export declare function ld(source: string): LdObject[]

/**
 * First present value in `graph` for any of `keys`, scanning objects then keys in order.
 * `undefined` if no object carries any of the keys.
 */
export declare function pick(graph: LdObject[], ...keys: string[]): unknown

/** Coerce a person/organization shape (string, `{name}`, or array) down to a name. */
export declare function asName(value: unknown): unknown

/** Coerce an image/URL shape (string, `{url}`/`{contentUrl}`, or array) down to a URL. */
export declare function asUrl(value: unknown): unknown

export declare namespace ld {
  export {pick, asName, asUrl}
}

export default ld
