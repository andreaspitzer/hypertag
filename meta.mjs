// Native ESM entry for the metadata layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/meta'` works without a build step, exactly as hypertag.mjs
// mirrors hypertag.js.
import metaImpl from './meta.js'

export default metaImpl
export const metadata = metaImpl.metadata
export const extract = metaImpl.extract
export const rules = metaImpl.rules
export const meta = metaImpl.meta
export const link = metaImpl.link
export const content = metaImpl.content
export const attr = metaImpl.attr
export const ld = metaImpl.ld
export const ldName = metaImpl.ldName
export const ldUrl = metaImpl.ldUrl
export const favicon = metaImpl.favicon
export const favicons = metaImpl.favicons
