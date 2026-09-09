import test from 'ava'
import ld from '../ld.js'

const {pick, asName, asUrl} = ld

test('ld() parses and returns JSON-LD blocks', t => {
  const html = '<script type="application/ld+json">{"@type":"Article","headline":"Hi"}</script>'
  t.deepEqual(ld(html), [{'@type': 'Article', headline: 'Hi'}])
})

test('ld() flattens @graph and top-level arrays into one list', t => {
  const graph = '<script type="application/ld+json">{"@graph":[{"a":1},{"b":2}]}</script>'
  t.deepEqual(ld(graph), [{a: 1}, {b: 2}])
  const arr = '<script type="application/ld+json">[{"a":1},{"b":2}]</script>'
  t.deepEqual(ld(arr), [{a: 1}, {b: 2}])
})

test('ld() merges multiple blocks in document order', t => {
  const html =
    '<script type="application/ld+json">{"a":1}</script>' +
    '<script type="application/ld+json">{"b":2}</script>'
  t.deepEqual(ld(html), [{a: 1}, {b: 2}])
})

test('ld() skips invalid JSON and non-object JSON, ignores non-ld scripts', t => {
  t.deepEqual(ld('<script type="application/ld+json">{bad json}</script>'), [])
  t.deepEqual(ld('<script type="application/ld+json">42</script>'), []) // non-object
  t.deepEqual(ld('<script type="text/javascript">{"a":1}</script>'), []) // not ld+json
  t.deepEqual(ld('<script>var x = 1</script>'), []) // no type at all
})

test('ld() type match is case-insensitive', t => {
  t.deepEqual(ld('<script type="Application/LD+JSON">{"a":1}</script>'), [{a: 1}])
})

test('pick returns the first present value across objects then keys', t => {
  const graph = [{name: 'A'}, {headline: 'B'}]
  t.is(pick(graph, 'headline', 'name'), 'A') // first object carries name
  t.is(pick([{headline: 'B'}], 'headline', 'name'), 'B')
  t.is(pick(graph, 'missing'), undefined)
})

test('pick skips null entries in the graph', t => {
  t.is(pick([null, {a: 'x'}], 'a'), 'x')
})

test('asName coerces string, {name}, and array shapes', t => {
  t.is(asName('Jane'), 'Jane')
  t.is(asName({name: 'Jane'}), 'Jane')
  t.is(asName([{name: 'Jane'}, {name: 'Bob'}]), 'Jane')
  t.is(asName(42), 42) // primitive passthrough
})

test('asUrl coerces string, {url}/{contentUrl}, and array shapes', t => {
  t.is(asUrl('/a.png'), '/a.png')
  t.is(asUrl({url: '/a.png'}), '/a.png')
  t.is(asUrl({contentUrl: '/b.png'}), '/b.png')
  t.is(asUrl([{url: '/a.png'}]), '/a.png')
})
