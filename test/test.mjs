import test from 'ava'
import parseTags from '../parse.js'

const {stripComments, parseAttrs} = parseTags

test('full HTML', t => {
  const result = parseTags(`
  <!--
    <ignore comment="true"/>
  -->
    <hello world="yes">
    <hello>
    <>
    <ignore this too>
  `, 'hello')
  t.deepEqual(result, [
    {
      $tag: 'hello',
      world: 'yes'
    },
    {
      $tag: 'hello'
    }
  ])
})

test('extend', t => {
  const randomTagName = randomString()
  const randomAttr = randomString()
  const randomValue = randomString()
  const tagKey = randomString()

  const input = `<${randomTagName} ${randomAttr}="${randomValue}">`
  const expect = {
    [tagKey]    : randomTagName,
    [randomAttr]: randomValue
  }
  const parse = parseTags.extend(randomTagName, {tagKey})
  const result = parse(input)
  t.deepEqual(result, [expect])
})

test('string and array arguments', t => {
  const input = '<hello who="world">'
  const expected = [{$tag: 'hello', who: 'world'}]

  t.deepEqual(parseTags(input, 'hello'), expected)
  t.deepEqual(parseTags(input, ['hello']), expected)
})

test('stripComments', t => {
  t.is(
    stripComments('Hello, <!-- this -->world<!-- another comment -->!'),
    'Hello, world!'
  )
})

test('attributes', t => {
  const randomTagName = randomString()
  const randomAttr = randomString()
  const randomValue = randomString()
  const tagKey = randomString()

  const input = `
    <${randomTagName} ${randomAttr}>
    <${randomTagName} ${randomAttr}= "${randomValue}">
    <${randomTagName} ${randomAttr} ='${randomValue}'>
    <${randomTagName} ${randomAttr} =  ${randomValue}>
    <${randomTagName} emptyTag      =  "">
    <${randomTagName} emptyTag      =  ''>
    <${randomTagName} emptyTag      =  >
    <${randomTagName}
      ${randomAttr} = ${randomValue}>
    <${randomTagName} ${randomAttr}
    =${randomValue}>
  `
  const parse = parseTags.extend(randomTagName, {tagKey})
  const result = parse(input)
  t.deepEqual(result, [
    {[tagKey]: randomTagName, [randomAttr]: true},
    {[tagKey]: randomTagName, [randomAttr]: randomValue},
    {[tagKey]: randomTagName, [randomAttr]: randomValue},
    {[tagKey]: randomTagName, [randomAttr]: randomValue},
    {[tagKey]: randomTagName, emptyTag: ''},
    {[tagKey]: randomTagName, emptyTag: ''},
    {[tagKey]: randomTagName, emptyTag: true},
    {[tagKey]: randomTagName, [randomAttr]: randomValue},
    {[tagKey]: randomTagName, [randomAttr]: randomValue}
  ])
})

test('getTags with dash in tag', t => {
  const randomTag = [randomString(), randomString()].join('-')
  t.deepEqual(
    parseTags(`<${randomTag}>`, randomTag),
    [{
      $tag: randomTag
    }])
})

test('getTags with non-tag string', t => {
  t.deepEqual(parseTags(''), [])
})

test('parseAttrs with non-tag string', t => {
  t.is(parseAttrs(''), undefined)
})

test('match all tags', t => {
  const generatedTags = []
  for (let i = 0; i < 10; i++) {
    generatedTags.push(randomString())
  }
  const html = generatedTags
    .map(tag => `<${tag}></${tag}>`)
    .join('\n')
    + '<title>'
  const expected = [
    ...generatedTags.map(tagname => ({$tag: tagname})),
    {$tag: 'title'}
  ]

  const result = parseTags(html, '*')
  t.deepEqual(result, expected)
})

test('a cache memoizes identical parses; a different tag set gets its own entry', t => {
  const html = '<meta name="a" content="1"><link rel="x">'
  const cache = new Map()
  const first = parseTags(html, 'meta', undefined, cache)
  const second = parseTags(html, 'meta', undefined, cache)
  t.is(first, second) // cache hit → same array reference
  t.not(parseTags(html, 'link', undefined, cache), first) // different tags → own entry
  // no cache → a fresh array each call
  t.not(parseTags(html, 'meta'), parseTags(html, 'meta'))
})

test('a cache keys content mode separately and matches the uncached result', t => {
  const html = '<title>Hi</title>'
  const cache = new Map()
  const uncached = parseTags(html, 'title', {content: true})
  const a = parseTags(html, 'title', {content: true}, cache)
  const b = parseTags(html, 'title', {content: true}, cache)
  t.is(a, b)
  t.deepEqual(a, uncached)
  t.not(parseTags(html, 'title', undefined, cache), a) // non-content mode is a separate entry
})

test('separate caches never share entries', t => {
  const html = '<meta name="a" content="1">'
  const cacheA = new Map()
  const cacheB = new Map()
  t.not(parseTags(html, 'meta', undefined, cacheA), parseTags(html, 'meta', undefined, cacheB))
})

function randomString() {
  return Math.random().toString(36).slice(2)
}
