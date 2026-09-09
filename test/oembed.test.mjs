import test from 'ava'
import oembedEndpoint from '../oembed.js'

const {providers} = oembedEndpoint

test('resolves popular providers (incl. antibot SPAs) to a ready-to-fetch endpoint', t => {
  t.is(
    oembedEndpoint('https://www.tiktok.com/@u/video/123'),
    'https://www.tiktok.com/oembed?format=json&url=https%3A%2F%2Fwww.tiktok.com%2F%40u%2Fvideo%2F123'
  )
  t.is(
    oembedEndpoint('https://twitter.com/jack/status/20'),
    'https://publish.twitter.com/oembed?format=json&url=https%3A%2F%2Ftwitter.com%2Fjack%2Fstatus%2F20'
  )
})

test('replaces the {format} placeholder in path-style endpoints', t => {
  t.true(oembedEndpoint('https://vimeo.com/76979871').startsWith('https://vimeo.com/api/oembed.json?'))
})

test('appends with & when the endpoint already carries a query', t => {
  const list = [{name: 'x', endpoint: 'https://api.x.test/oembed?v=1', schemes: ['https://x.test/*']}]
  t.is(
    oembedEndpoint('https://x.test/abc', list),
    'https://api.x.test/oembed?v=1&format=json&url=https%3A%2F%2Fx.test%2Fabc'
  )
})

test('returns null for a non-provider url or a non-string', t => {
  t.is(oembedEndpoint('https://example.com/none'), null)
  t.is(oembedEndpoint(42), null)
})

test('is pluggable: a custom list overrides the default registry', t => {
  const list = [{name: 'mine', endpoint: 'https://e.test/o', schemes: ['https://mine.test/p/*']}]
  t.is(
    oembedEndpoint('https://mine.test/p/9', list),
    'https://e.test/o?format=json&url=https%3A%2F%2Fmine.test%2Fp%2F9'
  )
  t.is(oembedEndpoint('https://www.tiktok.com/@u/video/1', list), null) // default TikTok not in the custom list
})

test('the default registry is exported and curated', t => {
  t.true(providers.length >= 20)
  t.true(providers.every(p => typeof p.endpoint === 'string' && Array.isArray(p.schemes)))
})
