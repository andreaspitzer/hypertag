import test from 'ava'
import parse from '../hypertag.js'
import sanitize from '../sanitize.js'

const {decode, cleanUrl} = sanitize

test('decode: named and numeric references', t => {
  t.is(decode('a &amp; b'), 'a & b')
  t.is(decode('it&#39;s'), "it's")
  t.is(decode('it&#x27;s'), "it's")
  t.is(decode('caf&eacute;'), 'caf&eacute;') // rare named left verbatim (built-in is tiny)
})

test('decode: Windows-1252 remap of 0x80-0x9F numeric references', t => {
  t.is(decode('em&#151;dash'), 'em—dash') // 0x97 -> em dash, not U+0097
  t.is(decode('right&#146;quote'), 'right’quote') // 0x92 -> right single quote
  t.is(decode('ellipsis&#133;'), 'ellipsis…') // 0x85 -> horizontal ellipsis
})

test('decode: fast path and prototype safety', t => {
  t.is(decode('no entities here'), 'no entities here') // no '&' -> unchanged
  t.is(decode('&constructor;'), '&constructor;') // not a real entity, left verbatim
  t.is(decode('&#x110000;'), '&#x110000;') // out of Unicode range -> left verbatim
  t.is(decode('&#xD800;'), '&#xD800;') // lone surrogate -> left verbatim
})

test('sanitize: string decodes, collapses horizontal whitespace, trims', t => {
  t.is(sanitize('  Rock &amp;   Roll\t'), 'Rock & Roll')
})

test('sanitize: preserves line breaks (content, not formatting), tidies around them', t => {
  t.is(sanitize('first line.\nsecond line.'), 'first line.\nsecond line.')
  t.is(sanitize('a  \n  b'), 'a\nb') // spaces around the newline collapse, newline stays
  t.is(sanitize('trailing\n'), 'trailing') // trailing newline trimmed
})

test('sanitize: cleans every string value of a Tag, preserves booleans and tag key', t => {
  t.deepEqual(sanitize({$tag: 'meta', content: 'a &amp; b', 'data-x': true}), {
    $tag: 'meta',
    content: 'a & b',
    'data-x': true
  })
})

test('sanitize: maps over an array of tags, non-strings pass through', t => {
  t.deepEqual(sanitize([{content: 'x &amp; y'}, {content: 'p &amp; q'}]), [
    {content: 'x & y'},
    {content: 'p & q'}
  ])
  t.is(sanitize(true), true)
  t.is(sanitize(42), 42)
})

test('sanitize: works directly on parse() output', t => {
  const tags = parse('<meta name="d" content="Rock &amp; Roll &#151; live">', 'meta')
  t.deepEqual(sanitize(tags), [{$tag: 'meta', name: 'd', content: 'Rock & Roll — live'}])
})

test('sanitize: pluggable decoder via options.decode', t => {
  // A stand-in "full" decoder that knows an entity the built-in does not.
  const fullDecode = s => s.replace('&eacute;', 'é')
  t.is(sanitize('caf&eacute;', {decode: fullDecode}), 'café')
  t.is(sanitize('caf&eacute;').includes('&eacute;'), true) // built-in leaves it
})

test('cleanUrl: resolves relative and strips utm params', t => {
  t.is(
    cleanUrl('/p?a=1&utm_source=x&utm_medium=y', 'https://example.com/base'),
    'https://example.com/p?a=1'
  )
})

test('cleanUrl: strips credentials and text fragments', t => {
  t.is(cleanUrl('https://user:pass@example.com/p'), 'https://example.com/p')
  t.is(cleanUrl('https://example.com/p#sec:~:text=hello'), 'https://example.com/p#sec')
})

test('cleanUrl: passes through non-URLs and non-strings', t => {
  t.is(cleanUrl('not a url'), 'not a url')
  t.is(cleanUrl(true), true)
})
