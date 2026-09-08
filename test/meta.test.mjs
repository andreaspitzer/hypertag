import test from 'ava'
import metadata from '../meta.js'

const {extract, meta, link, content, rules} = metadata

// A page exercising most sources: og (html), og written as name= (leniency), a relative
// image (url normalization), an entity in a text field, canonical, a raw date, and JSON-LD
// author + publisher in object shapes.
const page = `
  <title>Fallback &amp; Title</title>
  <meta property="og:title" content="OG Title &amp; More">
  <meta name="og:description" content="Desc via name">
  <meta property="og:image" content="/img/pic.png">
  <link rel="canonical" href="https://ex.com/canon">
  <meta property="article:published_time" content="2020-01-02T03:04:05Z">
  <script type="application/ld+json">
    {"@type":"Article","author":{"name":"Jane Doe"},"publisher":{"name":"Acme"}}
  </script>
`
const base = 'https://ex.com/page'

test('metadata() with default rules resolves every field', t => {
  t.deepEqual(metadata(page, base), {
    title: 'OG Title & More', // og:title, entity decoded
    description: 'Desc via name', // og:description written as name=
    image: 'https://ex.com/img/pic.png', // relative resolved against base
    url: 'https://ex.com/canon', // og:url absent → canonical
    author: 'Jane Doe', // JSON-LD author {name} coerced
    date: '2020-01-02T03:04:05Z', // raw, not normalized
    publisher: 'Acme' // JSON-LD publisher {name} coerced
  })
})

test('property-or-name leniency: og: written as name= is still found', t => {
  const html = '<meta name="og:image" content="https://ex.com/n.png">'
  t.is(metadata(html, base).image, 'https://ex.com/n.png')
})

test('title falls through to twitter, then JSON-LD, then <title> text', t => {
  t.is(metadata('<title>Just Title</title>', base).title, 'Just Title')
  t.is(metadata('<meta name="twitter:title" content="TW">', base).title, 'TW')
  t.is(
    metadata('<script type="application/ld+json">{"headline":"LD Head"}</script>', base).title,
    'LD Head'
  )
})

test('an empty value falls through to the next source', t => {
  const html = '<meta property="og:title" content=""><meta name="twitter:title" content="TW">'
  t.is(metadata(html, base).title, 'TW')
})

test('a field with no matching source is null', t => {
  const {image, author, date} = metadata('<title>x</title>', base)
  t.is(image, null)
  t.is(author, null)
  t.is(date, null)
})

test('JSON-LD image object is coerced and resolved', t => {
  const html = '<script type="application/ld+json">{"image":{"url":"/og/x.png"}}</script>'
  t.is(metadata(html, base).image, 'https://ex.com/og/x.png')
})

test('the url normalizer strips tracking params', t => {
  const html = '<meta property="og:url" content="https://ex.com/p?utm_source=t&keep=1">'
  t.is(metadata(html, base).url, 'https://ex.com/p?keep=1')
})

test('extract() runs a custom rules table', t => {
  const custom = {
    heading: {text: [content('title'), meta('og:title')]},
    css: {raw: [link('stylesheet')]}
  }
  const html = '<title>Hi &amp; Bye</title><link rel="stylesheet" href="/a.css">'
  t.deepEqual(extract(html, base, custom), {heading: 'Hi & Bye', css: '/a.css'})
})

test('extract.compile is reusable across pages', t => {
  const run = extract.compile({title: {text: [meta('og:title')]}})
  t.is(run('<meta property="og:title" content="A">').title, 'A')
  t.is(run('<meta property="og:title" content="B">').title, 'B')
  t.is(run('<p>').title, null)
})

test('metadata() without a url leaves absolute URLs intact', t => {
  const html = '<meta property="og:url" content="https://ex.com/x">'
  t.is(metadata(html).url, 'https://ex.com/x')
})

test('concurrent extractions never mix results (each call owns its cache)', async t => {
  const pages = Array.from({length: 25}, (_, i) => ({
    i,
    html: `<meta property="og:title" content="Title ${i}"><meta property="og:url" content="https://ex.com/${i}">`
  }))
  // Fire all extractions concurrently, yielding the event loop around each, to interleave them.
  const results = await Promise.all(
    pages.map(async ({i, html}) => {
      await Promise.resolve()
      const m = metadata(html, 'https://ex.com/')
      await Promise.resolve()
      return {i, m}
    })
  )
  for (const {i, m} of results) {
    t.is(m.title, `Title ${i}`)
    t.is(m.url, `https://ex.com/${i}`)
  }
})

test('the default rules table is exported and overridable', t => {
  t.truthy(rules.title)
  // Passing a custom table to metadata() uses it instead of the default.
  const only = {title: {text: [meta('og:title')]}}
  t.deepEqual(metadata('<meta property="og:title" content="X">', base, only), {title: 'X'})
})
