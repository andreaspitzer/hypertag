import {readFile} from 'node:fs/promises'
import test from 'ava'
import parse from '../hypertag.js'
import select from '../select.js'

const {compile, pick} = select

const html = `
  <link rel="alternate" hreflang="en" href="/en">
  <link rel="alternate" hreflang="en-GB" href="/en-gb">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="stylesheet" href="/app.css">
  <link disabled>
  <link title="">
  <meta name="description" content="hi">
`

test('tag-only selector equals parse(html, tag)', t => {
  t.deepEqual(select(html, 'link'), parse(html, 'link'))
})

test('wildcard and omitted tag behave alike', t => {
  t.deepEqual(select(html, '*[rel=alternate]'), select(html, '[rel=alternate]'))
  t.is(select(html, '[rel=alternate]').length, 2)
})

test('presence [attr]: key exists regardless of value', t => {
  t.is(select(html, 'link[hreflang]').length, 2)
  t.is(select(html, 'link[disabled]').length, 1) // valueless attr counts
  t.is(select(html, 'link[title]').length, 1) // empty-string value counts
  t.is(select(html, 'link[nope]').length, 0)
})

test('equality: unquoted, double- and single-quoted are identical', t => {
  const a = select(html, 'link[rel=alternate]')
  const b = select(html, 'link[rel="alternate"]')
  const c = select(html, "link[rel='alternate']")
  t.deepEqual(a, b)
  t.deepEqual(a, c)
  t.is(a.length, 2)
})

test('multiple conditions AND-combine', t => {
  t.is(select(html, 'link[rel=alternate][hreflang=en]').length, 1)
  t.is(select(html, 'link[rel=alternate][hreflang=zz]').length, 0)
})

test('operator ^= (starts-with)', t => {
  t.is(select(html, 'link[href^="/en"]').length, 2)
  t.is(select(html, 'link[href^="/x"]').length, 0)
})

test('operator $= (ends-with)', t => {
  t.is(select(html, 'link[href$=.css]').length, 1)
})

test('operator *= (contains)', t => {
  t.is(select(html, 'link[href*=favicon]').length, 1)
})

test('operator ~= (whitespace-separated word)', t => {
  t.is(select(html, 'link[rel~=icon]').length, 1) // matches rel="shortcut icon"
  t.is(select(html, 'link[rel=icon]').length, 0) // exact equality does not
  t.is(select(html, 'link[rel~="shortcut icon"]').length, 0) // operand with whitespace never matches
})

test('operator |= (equals or value- prefix)', t => {
  t.is(select(html, 'link[hreflang|=en]').length, 2) // en and en-GB
  t.is(select(html, 'link[hreflang|=e]').length, 0)
})

test('operator != (absent key or differing value)', t => {
  // link[rel!=alternate] matches every link whose rel is not "alternate",
  // including <link disabled> and <link title=""> which have no rel at all.
  const nonAlternate = select(html, 'link[rel!=alternate]')
  t.is(nonAlternate.length, 4) // 6 links minus the 2 alternates
})

test('boolean valueless attribute value semantics', t => {
  const b = '<b disabled>'
  t.is(select(b, 'b[disabled]').length, 1)
  t.is(select(b, 'b[disabled=""]').length, 1) // coerces to '' === ''
  t.is(select(b, 'b[disabled=true]').length, 0) // literal string "true" never appears
})

test('empty operand for ^= $= *= ~= matches nothing', t => {
  t.is(select(html, 'link[href^=]').length, 0)
  t.is(select(html, 'link[href$=]').length, 0)
  t.is(select(html, 'link[href*=]').length, 0)
  t.is(select(html, 'link[rel~=]').length, 0)
})

test('curried compile() is reusable across sources', t => {
  const alternates = compile('link[rel=alternate]')
  t.is(alternates(html).length, 2)
  t.is(alternates('<link rel="alternate" href="/x">').length, 1)
  t.is(alternates('<link rel="stylesheet">').length, 0)
})

test('matching is case-insensitive by default (name and value)', t => {
  const messy = '<META PROPERTY="OG:Title" CONTENT="hi">'
  t.is(select(messy, 'meta[property=og:title]').length, 1) // value case folds
  t.is(select(messy, 'meta[PROPERTY=og:title]').length, 1) // name case folds
  t.is(select(messy, 'meta[property^=OG:]').length, 1) // operators fold too
  t.is(select('<link rel="Shortcut Icon">', 'link[rel~=icon]').length, 1)
})

test('the s flag forces case-sensitive matching', t => {
  const messy = '<meta property="OG:Title" content="hi">'
  t.is(select(messy, 'meta[property=og:title s]').length, 0) // value now case-sensitive
  t.is(select(messy, 'meta[property=OG:Title s]').length, 1) // exact case matches
  // under `s`, the attribute name is case-sensitive too: PROPERTY no longer matches property.
  t.is(select('<meta PROPERTY="og:title" content="x">', 'meta[property=og:title s]').length, 0)
})

test('unsupported selectors throw', t => {
  t.throws(() => select(html, 'a > b'), {instanceOf: TypeError})
  t.throws(() => select(html, 'a b'), {instanceOf: TypeError})
  t.throws(() => select(html, 'link[rel=alternate] junk'), {instanceOf: TypeError})
  t.throws(() => select(html, 'link[a=1] [b=2]'), {instanceOf: TypeError}) // gap before a later clause
  t.throws(() => compile(42), {instanceOf: TypeError})
})

test('selector list: comma unions the groups in document order', t => {
  // Two whole groups OR-combine. The <link disabled> and <link title=""> have neither rel,
  // so only the alternates (2) and the description meta (1) match, in source order.
  const hits = select(html, 'link[rel=alternate], meta[name=description]')
  t.deepEqual(
    hits.map(el => el.$tag),
    ['link', 'link', 'meta']
  )
  t.is(hits.length, 3)
})

test('selector list follows document order, not selector order', t => {
  // The stylesheet <link> sits above the description <meta> in the source, so it comes first
  // even though its group is written second in the selector.
  const list = select(html, 'meta[name=description], link[rel=stylesheet]')
  t.deepEqual(list, [
    ...parse(html, 'link').filter(l => l.rel === 'stylesheet'),
    ...parse(html, 'meta').filter(m => m.name === 'description')
  ])
})

test('selector list: each group binds its conditions to its own tag (no cross-match)', t => {
  // The swapped-attribute case: a <link> carrying meta's attribute and a <meta> carrying
  // link's. Group `link[rel=canonical]` needs a <link> WITH rel=canonical; group
  // `meta[property^=og:]` needs a <meta> WITH property=og:*. Neither element satisfies its
  // own group, and groups never cross, so the result is empty.
  const swapped = '<link property="og:keywords" content="x"><meta rel="canonical" href="/y">'
  t.deepEqual(select(swapped, 'link[rel=canonical], meta[property^=og:]'), [])

  // Sanity: put each attribute back on its correct tag and both groups match.
  const correct = '<link rel="canonical" href="/y"><meta property="og:keywords" content="x">'
  const hits = select(correct, 'link[rel=canonical], meta[property^=og:]')
  t.deepEqual(hits.map(el => el.$tag), ['link', 'meta'])
})

test('selector list: an element matched by several groups appears once', t => {
  const page = '<meta name="description" content="d">'
  // Both groups match the same <meta>; it must not be duplicated.
  t.is(select(page, 'meta[name=description], meta[content]').length, 1)
})

test('selector list: a wildcard group widens the parse to every tag', t => {
  const page = '<title>T</title><meta name="x" content="y"><link rel="canonical">'
  // `*[name]` matches any tag with a name attribute; `link[rel]` adds the link.
  const hits = select(page, '*[name], link[rel]')
  t.deepEqual(hits.map(el => el.$tag), ['meta', 'link'])
})

test('selector list: a top-level comma splits, one inside [] does not', t => {
  const page = '<meta name="a,b" content="x"><meta name="c" content="y">'
  // The comma inside the quoted value is part of the value, so this is ONE group.
  t.is(select(page, 'meta[name="a,b"]').length, 1)
  // A real top-level comma makes two groups.
  t.is(select(page, 'meta[name="a,b"], meta[name=c]').length, 2)
})

test('selector list: honours a custom tagKey when re-checking each group tag', t => {
  const page = '<meta name="x" content="y"><link rel="canonical" href="/z">'
  const hits = select(page, 'meta[name=x], link[rel=canonical]', {tagKey: 'tag'})
  // The tag name lands under the custom key, and the per-group tag check reads it from there.
  t.deepEqual(hits.map(el => el.tag), ['meta', 'link'])
  t.false('$tag' in hits[0])
})

test('selector list: stray, leading, and trailing commas throw', t => {
  t.throws(() => select(html, 'link,'), {instanceOf: TypeError}) // trailing
  t.throws(() => select(html, ',meta'), {instanceOf: TypeError}) // leading
  t.throws(() => select(html, 'link,,meta'), {instanceOf: TypeError}) // empty middle group
  t.throws(() => select(html, ','), {instanceOf: TypeError}) // nothing but a comma
})

test('presets are pre-baked selectors returning raw tags', t => {
  const page = `
    <meta property="og:title" content="OG"><meta property="og:image" content="/c.png">
    <meta name="twitter:card" content="summary">
    <link rel="canonical" href="/here"><link rel="icon" href="/f.ico">
    <link rel="apple-touch-icon" href="/t.png"><link rel="stylesheet" href="/a.css">
    <link rel="alternate" hreflang="de" href="/de">
  `
  t.is(select.og(page).length, 2)
  t.is(select.twitter(page).length, 1)
  t.is(select.icons(page).length, 2) // icon + apple-touch-icon both contain "icon"
  t.is(select.canonical(page).length, 1)
  t.is(select.stylesheets(page).length, 1)
  t.is(select.alternates(page).length, 1)
})

test('content-aware presets: title and jsonld carry element content', t => {
  const page = '<title>My &amp; Page</title><script type="application/ld+json">{"@type":"Article"}</script>'
  t.is(select.title(page)[0].$content, 'My &amp; Page') // raw; pair with sanitize.decode
  t.is(JSON.parse(select.jsonld(page)[0].$content)['@type'], 'Article')
})

test('pick returns the first source with a usable value, in preference order', t => {
  const page = '<meta name="twitter:title" content="TW"><meta property="og:title" content="OG">'
  // Preference is source order, NOT document order: og:title wins though it comes second.
  t.is(pick(page, ['meta[property=og:title]', 'meta[name=twitter:title]'], {attr: 'content'}), 'OG')
  // Fall through to the second source when the first is absent.
  t.is(pick('<meta name="twitter:title" content="TW">', ['meta[property=og:title]', 'meta[name=twitter:title]'], {attr: 'content'}), 'TW')
  // Nothing matches → undefined.
  t.is(pick('<p>', ['meta[property=og:title]'], {attr: 'content'}), undefined)
})

test('pick per-source attr overrides the default', t => {
  const page = '<meta property="og:url" content="/a"><link rel="canonical" href="/b">'
  t.is(pick(page, [['meta[property=og:url]', 'content'], ['link[rel=canonical]', 'href']]), '/a')
  t.is(pick('<link rel="canonical" href="/b">', [['meta[property=og:url]', 'content'], ['link[rel=canonical]', 'href']]), '/b')
})

test('pick with no attribute yields the matched tag', t => {
  const page = '<link rel="canonical" href="/x">'
  t.deepEqual(pick(page, ['link[rel=canonical]']), {$tag: 'link', rel: 'canonical', href: '/x'})
})

test('pick reads $content, enabling the content option automatically', t => {
  t.is(pick('<title>Hello</title>', [['title', '$content']]), 'Hello')
})

test('pick skips absent and empty values, falling through to the next source', t => {
  const page = '<meta property="og:title" content=""><meta name="twitter:title" content="TW">'
  // og:title is present but empty → treated as no value, falls through.
  t.is(pick(page, ['meta[property=og:title]', 'meta[name=twitter:title]'], {attr: 'content'}), 'TW')
})

test('pick matches case-insensitively and reads the attribute case-insensitively', t => {
  const page = '<META PROPERTY="OG:Title" CONTENT="Y">'
  t.is(pick(page, ['meta[property=og:title]'], {attr: 'content'}), 'Y')
})

test('pick.compile bakes the sources once and is reusable', t => {
  const title = pick.compile(['meta[property=og:title]', 'meta[name=twitter:title]'], {attr: 'content'})
  t.is(title('<meta property="og:title" content="A">'), 'A')
  t.is(title('<meta name="twitter:title" content="B">'), 'B')
  t.is(title('<p>'), undefined)
})

test('pick handles a comma-group source (property-or-name union)', t => {
  // MDN-style: og: written as name= instead of property=. A union source catches both.
  const asName = '<meta name="og:image" content="/n.png">'
  const asProp = '<meta property="og:image" content="/p.png">'
  const src = [['meta[property=og:image], meta[name=og:image]', 'content']]
  t.is(pick(asName, src), '/n.png')
  t.is(pick(asProp, src), '/p.png')
})

test('twitter fixture parity with parse().filter()', async t => {
  const text = await readFile(new URL('./fixture-twitter.html', import.meta.url), 'utf-8')
  // select matches case-insensitively by default, so the equivalent hand filter folds case.
  t.deepEqual(
    select(text, 'link[rel=alternate]'),
    parse(text, 'link').filter(({rel}) => typeof rel === 'string' && rel.toLowerCase() === 'alternate')
  )
})
