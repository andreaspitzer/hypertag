// hypertag - the batteries-included convenience barrel (ADR-0002). A CURATED, named-only
// re-export of the whole public API, so the common case is `import {fromUrl, metadata} from
// 'hypertag'`; ESM tree-shaking (with `sideEffects:false`) trims what an importer does not use.
//
// The re-export is curated, not `export *`, because the layers have colliding names: `pick`
// lives on both select and ld, `ld` is both a meta source-helper and the ld-layer function, and
// `meta` is a source-helper. The meta source-helpers (`meta`, `link`, `content`, `attr`, `ld`,
// `ldName`, `ldUrl`) stay available only from `hypertag/meta`; `pick`/`compile` stay on the
// `select`/`ld` function objects and their own subpaths. Size-minimizing consumers still import a
// specific layer (`hypertag/parse`, `hypertag/meta`, ...) directly.
export {parse, parseAttrs, stripComments, extend} from './parse.js'
export {default as select} from './select.js'
export {sanitize, decode, cleanUrl} from './sanitize.js'
export {default as ld, asName, asUrl} from './ld.js'
export {metadata, extract, rules, favicon, favicons} from './meta.js'
export {fromUrl, oembed} from './fetch.js'
export {oembedEndpoint, providers} from './oembed.js'
