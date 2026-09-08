// Native ESM entry for the fetch layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/fetch'` works without a build step, exactly as the other .mjs
// mirrors do.
import fromUrlImpl from './fetch.js'

export default fromUrlImpl
export const fromUrl = fromUrlImpl
