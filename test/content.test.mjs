import test from 'ava'
import parse from '../hypertag.js'

test('captures element content under the > key alongside attributes', t => {
  t.deepEqual(parse('<title>Hello, world!</title>', 'title', {content: true}), [
    {'<': 'title', '>': 'Hello, world!'}
  ])
  t.deepEqual(
    parse('<script type="application/ld+json">{"a":1}</script>', 'script', {content: true}),
    [{'<': 'script', type: 'application/ld+json', '>': '{"a":1}'}]
  )
})

test('content is raw (undecoded) - pair with hypertag/sanitize to decode', t => {
  t.is(parse('<title>Rock &amp; Roll</title>', 'title', {content: true})[0]['>'], 'Rock &amp; Roll')
})

test('JSON-LD round-trips through JSON.parse', t => {
  const html = '<html><script type="application/ld+json">{"@type":"Article","headline":"Hi"}</script>'
  const [tag] = parse(html, 'script', {content: true}).filter(s => /ld\+json/i.test(s.type ?? ''))
  t.is(JSON.parse(tag['>'])['@type'], 'Article')
})

test('raw-text content keeps < and > verbatim (script does not parse as HTML)', t => {
  t.is(parse('<script>if (a < b && c > d) go()</script>', 'script', {content: true})[0]['>'], 'if (a < b && c > d) go()')
})

test('close tag matches case-insensitively (tag name preserved as written)', t => {
  t.deepEqual(parse('<TITLE>Hi</Title>', 'title', {content: true}), [{'<': 'TITLE', '>': 'Hi'}])
})

test('multiple occurrences each get their content', t => {
  t.deepEqual(parse('<style>a{}</style><style>b{}</style>', 'style', {content: true}), [
    {'<': 'style', '>': 'a{}'},
    {'<': 'style', '>': 'b{}'}
  ])
})

test('fault tolerance: an unclosed element is skipped, not thrown or hung', t => {
  t.notThrows(() => parse('<title>no close tag here', 'title', {content: true}))
  t.deepEqual(parse('<title>no close tag here', 'title', {content: true}), [])
  // a valid pair still matches; a trailing unclosed element is skipped
  t.deepEqual(parse('<title>Good</title><title>orphan', 'title', {content: true}), [
    {'<': 'title', '>': 'Good'}
  ])
})

test('nesting is best-effort: stops at the first close tag', t => {
  t.is(parse('<div>a<div>b</div>c</div>', 'div', {content: true})[0]['>'], 'a<div>b')
})

test('a custom contentKey is honored', t => {
  t.deepEqual(parse('<title>Hi</title>', 'title', {content: true, contentKey: 'text'}), [
    {'<': 'title', text: 'Hi'}
  ])
})

test('content mode still works through extend()', t => {
  const titles = parse.extend('title', {content: true})
  t.is(titles('<title>Bound</title>')[0]['>'], 'Bound')
})
