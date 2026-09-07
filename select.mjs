// Native ESM entry for the selector layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/select'` works without a build step, exactly as hypertag.mjs
// mirrors hypertag.js.
import selectImpl from './select.js'

export default selectImpl
export const select = selectImpl
export const compile = selectImpl.compile

// Named preset shortcuts (see select.js).
export const og = selectImpl.og
export const twitter = selectImpl.twitter
export const icons = selectImpl.icons
export const canonical = selectImpl.canonical
export const stylesheets = selectImpl.stylesheets
export const alternates = selectImpl.alternates
export const title = selectImpl.title
export const jsonld = selectImpl.jsonld
