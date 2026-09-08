// Native ESM entry for the JSON-LD layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/ld'` works without a build step, exactly as hypertag.mjs
// mirrors hypertag.js.
import ldImpl from './ld.js'

export default ldImpl
export const ld = ldImpl
export const pick = ldImpl.pick
export const asName = ldImpl.asName
export const asUrl = ldImpl.asUrl
