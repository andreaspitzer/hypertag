import test from 'ava'
import parseTags from '../hypertag.js'

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
      '<'  : 'hello',
      world: 'yes'
    },
    {
      '<': 'hello'
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
  const expected = [{'<': 'hello', who: 'world'}]

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
      '<': randomTag
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
    ...generatedTags.map(tagname => ({'<': tagname})),
    {'<': 'title'}
  ]

  const result = parseTags(html, '*')
  t.deepEqual(result, expected)
})

function randomString() {
  return Math.random().toString(36).slice(2)
}
