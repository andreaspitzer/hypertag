// Native ESM entry. Re-exports the CommonJS implementation so `import` works
// without a build step, while `require('hypertag')` stays a callable function.
import hypertag from './hypertag.js'

export default hypertag
export const parse = hypertag.parse
export const parseAttrs = hypertag.parseAttrs
export const stripComments = hypertag.stripComments
export const extend = hypertag.extend
