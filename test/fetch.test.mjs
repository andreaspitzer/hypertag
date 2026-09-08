import test from 'ava'
import fromUrl from '../fetch.js'
import metaDefault from '../meta.js'

const {oembed} = fromUrl
const {meta} = metaDefault

const PAGE = '<head><meta property="og:title" content="Hi &amp; bye"><meta property="og:image" content="/img.png"></head>'

test('fetches with a supplied fetch and returns the decoded, resolved card', async t => {
  const calls = []
  const fetch = async (u, init) => {
    calls.push([u, init])
    return {url: u, text: async () => PAGE}
  }
  const card = await fromUrl('https://example.com/a', {fetch})
  t.is(card.title, 'Hi & bye') // entity-decoded
  t.is(card.image, 'https://example.com/img.png') // resolved against the url
  t.is(calls[0][0], 'https://example.com/a')
  t.is(calls[0][1].redirect, 'follow') // default redirect
})

test('uses the final response url as the base and passes init through, caller overrides redirect', async t => {
  let init
  const fetch = async (_u, i) => {
    init = i
    return {url: 'https://final.example.com/x', text: async () => PAGE}
  }
  const card = await fromUrl('https://start.example.com/a', {
    fetch,
    headers: {'x-test': '1'},
    redirect: 'manual'
  })
  t.is(card.image, 'https://final.example.com/img.png') // resolved against res.url, not the request url
  t.is(init.headers['x-test'], '1') // extra options forwarded to fetch
  t.is(init.redirect, 'manual') // caller's value wins over the default
})

test('missing response url falls back to the request url; empty body yields an all-null card', async t => {
  const fetch = async () => ({text: async () => undefined}) // no url, no body
  const card = await fromUrl('https://noresurl.example.com/a', {fetch})
  t.is(card.title, null)
  t.is(card.image, null)
  t.is(card.icon, 'https://noresurl.example.com/favicon.ico') // still resolved against the request url
})

test('forwards a custom rules table to metadata (pure engine, no icon)', async t => {
  const fetch = async u => ({url: u, text: async () => PAGE})
  const card = await fromUrl('https://example.com', {fetch, rules: {heading: {text: [meta('og:title')]}}})
  t.deepEqual(Object.keys(card), ['heading'])
  t.is(card.heading, 'Hi & bye')
})

test('throws a TypeError when no fetch is available', async t => {
  await t.throwsAsync(() => fromUrl('https://example.com', {fetch: null}), {instanceOf: TypeError})
})

test('defaults to the global fetch and to empty options', async t => {
  const original = globalThis.fetch
  globalThis.fetch = async u => ({url: u, text: async () => PAGE})
  try {
    const card = await fromUrl('https://example.com/g') // no options at all
    t.is(card.title, 'Hi & bye')
  } finally {
    globalThis.fetch = original
  }
})

test('oembed() fetches and returns the endpoint JSON, forwarding init', async t => {
  let seen
  const fetch = async (u, init) => {
    seen = {u, init}
    return {json: async () => ({type: 'video', html: '<iframe>'})}
  }
  const data = await oembed('https://ex.com/oembed.json?url=x', {fetch, headers: {'x-k': '1'}})
  t.deepEqual(data, {type: 'video', html: '<iframe>'})
  t.is(seen.u, 'https://ex.com/oembed.json?url=x')
  t.is(seen.init.headers['x-k'], '1') // caller headers override the default accept
})

test('oembed() throws a TypeError when no fetch is available', async t => {
  await t.throwsAsync(() => oembed('https://ex.com/oembed.json', {fetch: null}), {instanceOf: TypeError})
})

test('oembed() defaults to the global fetch', async t => {
  const original = globalThis.fetch
  globalThis.fetch = async () => ({json: async () => ({ok: true})})
  try {
    t.deepEqual(await oembed('https://ex.com/oembed.json'), {ok: true})
  } finally {
    globalThis.fetch = original
  }
})
