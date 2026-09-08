// Native ESM entry for the oEmbed registry layer. Re-exports the CommonJS implementation so
// `import ... from 'hypertag/oembed'` works without a build step, exactly as the other mirrors.
import oembedEndpointImpl from './oembed.js'

export default oembedEndpointImpl
export const oembedEndpoint = oembedEndpointImpl
export const providers = oembedEndpointImpl.providers
