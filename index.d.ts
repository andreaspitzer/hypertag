// Type definitions for the batteries-included barrel (`import ... from 'hypertag'`).
// A curated, named-only surface: exactly the exports of index.js, each typed by re-exporting
// the underlying declaration from its per-entry `.d.ts`. No default export.
export {parse, parseAttrs, stripComments, extend} from './parse.js'
export {default as select} from './select.js'
export {sanitize, decode, cleanUrl} from './sanitize.js'
export {default as ld, asName, asUrl} from './ld.js'
export {metadata, extract, rules, favicon, favicons} from './meta.js'
export {fromUrl, oembed} from './fetch.js'
export {oembedEndpoint, providers} from './oembed.js'
