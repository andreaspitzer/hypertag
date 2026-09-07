// Native ESM entry for the selector layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/select'` works without a build step, exactly as hypertag.mjs
// mirrors hypertag.js.
import selectImpl from './select.js'

export default selectImpl
export const select = selectImpl
export const compile = selectImpl.compile
