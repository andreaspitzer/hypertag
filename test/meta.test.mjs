import test from 'ava'
import metadata from '../meta.js'

const {extract, meta, link, content, attr, rules, favicon, favicons} = metadata

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
    imageAlt: null,
    imageWidth: null,
    imageHeight: null,
    url: 'https://ex.com/canon', // og:url absent → canonical
    type: null,
    author: 'Jane Doe', // JSON-LD author {name} coerced
    date: '2020-01-02T03:04:05Z', // raw, not normalized
    publisher: 'Acme', // JSON-LD publisher {name} coerced
    keywords: null,
    locale: null,
    lang: null,
    themeColor: null,
    twitterCard: null,
    video: null,
    audio: null,
    icon: 'https://ex.com/favicon.ico', // no <link rel=icon> → /favicon.ico fallback
    domain: 'ex.com', // host of the resolved url
    contentType: 'article' // a publish date is present
  })
})

test('metadata() extracts the wide card when the tags are present', t => {
  const html = `
    <html lang="en-GB">
    <meta property="og:type" content="video.movie">
    <meta property="og:image:alt" content="A &amp; B">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="keywords" content="a, b &amp; c">
    <meta property="og:locale" content="en_US">
    <meta name="theme-color" content="#0a0a0a">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:video" content="/v/clip.mp4">
    <meta property="og:audio" content="//cdn.ex.com/a.mp3">
  `
  const m = metadata(html, base)
  t.is(m.type, 'video.movie')
  t.is(m.imageAlt, 'A & B') // text-decoded
  t.is(m.imageWidth, '1200')
  t.is(m.imageHeight, '630')
  t.is(m.keywords, 'a, b & c') // text-decoded
  t.is(m.locale, 'en_US')
  t.is(m.lang, 'en-GB') // attr('html', 'lang')
  t.is(m.themeColor, '#0a0a0a')
  t.is(m.twitterCard, 'summary_large_image')
  t.is(m.video, 'https://ex.com/v/clip.mp4') // url-normalized against base
  t.is(m.audio, 'https://cdn.ex.com/a.mp3') // protocol-relative resolved
  t.is(m.contentType, 'video') // media wins
})

test('derived contentType covers each branch', t => {
  t.is(metadata('<meta property="og:audio" content="https://ex.com/a.mp3">', base).contentType, 'audio')
  t.is(metadata('<meta property="og:type" content="article">', base).contentType, 'article') // by type
  t.is(metadata('<meta property="article:published_time" content="2020-01-01">', base).contentType, 'article') // by date
  t.is(metadata('<meta property="og:type" content="profile">', base).contentType, 'profile') // declared type
  t.is(metadata('<title>x</title>', base).contentType, 'website') // default
})

test('derived domain: from the url, from the base, or null when unparseable/absent', t => {
  t.is(metadata('<meta property="og:url" content="https://sub.ex.com/p">', base).domain, 'sub.ex.com')
  t.is(metadata('<title>x</title>', base).domain, 'ex.com') // falls back to the base
  t.is(metadata('<title>x</title>').domain, null) // no url and no base
  t.is(metadata('<title>x</title>', 'not-a-url').domain, null) // unparseable base
})

test('derived lang: from <html lang>, then og:locale language, else null', t => {
  t.is(metadata('<html lang="en-GB">', base).lang, 'en-GB') // double-quoted
  t.is(metadata("<html lang='fr'>", base).lang, 'fr') // single-quoted
  t.is(metadata('<html lang=de>', base).lang, 'de') // unquoted
  t.is(metadata('<html lang="">', base).lang, null) // empty <html lang> → no value
  t.is(metadata('<meta property="og:locale" content="es_ES">', base).lang, 'es') // og:locale language
  t.is(metadata('<title>x</title>', base).lang, null) // neither
})

test('the attr() source reads any tag attribute in a custom rule', t => {
  const run = extract.compile({lang: {raw: [attr('html', 'lang')]}})
  t.is(run('<html lang="pt">').lang, 'pt')
  t.is(run('<div>no html</div>').lang, null)
})

test('property-or-name leniency: og: written as name= is still found', t => {
  const html = '<meta name="og:image" content="https://ex.com/n.png">'
  t.is(metadata(html, base).image, 'https://ex.com/n.png')
})

test('meta index: uppercase attribute names and values still resolve', t => {
  // Uppercase PROPERTY/CONTENT exercise the case-insensitive attribute scan; a valueless
  // property/name contributes nothing to the index.
  const html = '<meta PROPERTY="OG:TITLE" CONTENT="Upper"><meta property content="ignored">'
  t.is(metadata(html, base).title, 'Upper')
})

test('meta index: the first occurrence of a key wins', t => {
  const html = '<meta property="og:title" content="First"><meta property="og:title" content="Second">'
  t.is(metadata(html, base).title, 'First')
})

test('link index: rel-less links are skipped, whitespace rels split, first wins', t => {
  // og:url is absent, so the url field falls to link('canonical'). The first <link> has no rel
  // (skipped); the rel is padded with whitespace (split cleanly); a later canonical never wins.
  const html =
    '<link href="/no-rel"><link rel="  canonical  " href="/first"><link rel="canonical" href="/second">'
  t.is(metadata(html, base).url, 'https://ex.com/first')
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

test('favicons: declared icons resolved and ranked best-first, mask-icon dropped', t => {
  const page = `
    <link rel="icon" href="/small.png" sizes="16x16">
    <link rel="icon" href="/big.png" sizes="32x32">
    <link rel="apple-touch-icon" href="/apple.png">
    <link rel="mask-icon" href="/mask.svg" color="#000">
  `
  const icons = favicons(page, base)
  t.deepEqual(icons.map(i => i.url), [
    'https://ex.com/apple.png', // apple-touch-icon → 180
    'https://ex.com/big.png', // 32x32
    'https://ex.com/small.png' // 16x16
  ])
  t.false(icons.some(i => i.rel.includes('mask-icon')))
})

test('favicon: SVG / sizes=any win, and the largest of a multi-size wins', t => {
  const svg = '<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="icon" href="/32.png" sizes="32x32">'
  t.is(favicon(svg, base), 'https://ex.com/icon.svg') // svg → Infinity
  const any = '<link rel="icon" href="/scalable.png" sizes="any"><link rel="icon" href="/32.png" sizes="32x32">'
  t.is(favicon(any, base), 'https://ex.com/scalable.png') // any → Infinity
  const multi = '<link rel="icon" href="/multi.png" sizes="16x16 48x48"><link rel="icon" href="/32.png" sizes="32x32">'
  t.is(favicon(multi, base), 'https://ex.com/multi.png') // 48 > 32
})

test('favicon: a sizeless icon scores lowest, and ties keep document order', t => {
  // Two candidates so the ranking comparator actually runs: sizeless (score 0) loses to 32x32.
  t.is(
    favicon('<link rel="icon" href="/bare.png"><link rel="icon" href="/32.png" sizes="32x32">', base),
    'https://ex.com/32.png'
  )
  const ties = '<link rel="icon" href="/a.svg" type="image/svg+xml"><link rel="icon" href="/b.svg" type="image/svg+xml">'
  t.is(favicon(ties, base), 'https://ex.com/a.svg') // both Infinity → document order
})

test('favicon: hrefless icon links are ignored', t => {
  t.is(favicon('<link rel="icon"><link rel="icon" href="/real.png">', base), 'https://ex.com/real.png')
})

test('favicon: falls back to /favicon.ico, or null when there is nothing to resolve', t => {
  t.is(favicon('<title>x</title>', base), 'https://ex.com/favicon.ico') // none declared → browser default
  t.is(favicon('<title>x</title>'), null) // no icon and no url
  t.is(favicon('<title>x</title>', 'not-a-valid-base'), null) // unparseable base → null
})

test('metadata() includes a best-effort icon field', t => {
  t.is(metadata('<link rel="apple-touch-icon" href="/a.png">', base).icon, 'https://ex.com/a.png')
  t.is(metadata('<title>x</title>', base).icon, 'https://ex.com/favicon.ico') // fallback
})

test('the default rules table is exported and overridable', t => {
  t.truthy(rules.title)
  // Passing a custom table to metadata() uses it instead of the default.
  const only = {title: {text: [meta('og:title')]}}
  t.deepEqual(metadata('<meta property="og:title" content="X">', base, only), {title: 'X'})
})
