import {readFile} from 'node:fs/promises'
import test from 'ava'
import parse from '../hypertag.js'
import select from '../select.js'

const {compile} = select

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
  t.throws(() => select(html, 'link, meta'), {instanceOf: TypeError})
  t.throws(() => select(html, 'link[rel=alternate] junk'), {instanceOf: TypeError})
  t.throws(() => select(html, 'link[a=1] [b=2]'), {instanceOf: TypeError}) // gap before a later clause
  t.throws(() => compile(42), {instanceOf: TypeError})
})

test('twitter fixture parity with parse().filter()', async t => {
  const text = await readFile(new URL('./fixture-twitter.html', import.meta.url), 'utf-8')
  // select matches case-insensitively by default, so the equivalent hand filter folds case.
  t.deepEqual(
    select(text, 'link[rel=alternate]'),
    parse(text, 'link').filter(({rel}) => typeof rel === 'string' && rel.toLowerCase() === 'alternate')
  )
})
