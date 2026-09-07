// Native ESM entry for the sanitize layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/sanitize'` works without a build step, exactly as hypertag.mjs
// mirrors hypertag.js.
import sanitizeImpl from './sanitize.js'

export default sanitizeImpl
export const sanitize = sanitizeImpl
export const decode = sanitizeImpl.decode
export const cleanUrl = sanitizeImpl.cleanUrl
