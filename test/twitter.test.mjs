import {readFile} from 'node:fs/promises'
import test from 'ava'
import parse from '../hypertag.js'

test('correctly parses relevant tags from twitter.com', async t => {
  const text = await readFile(new URL('./fixture-twitter.html', import.meta.url), 'utf-8')
  const tags = parse(text, 'link')

  const hreflangs = 'x-default en ar ar-x-fm bg bn ca cs da de el en-GB es eu fa fi fr ga gl gu he hi hr hu id it ja kn ko mr ms nb nl pl pt ro ro sk sr sv ta th tr uk ur vi zh zh-Hant'.split(/\s+/)
  const languageLinks = tags.filter(({rel}) => rel === 'alternate')
  t.is(hreflangs.length, languageLinks.length)

  const iconLinks = tags.filter(({rel}) => /\bicon\b/i.test(rel))
  t.deepEqual(iconLinks, [
    {
      $tag: 'link',
      rel  : 'mask-icon',
      sizes: 'any',
      href : 'https://abs.twimg.com/responsive-web/client-web-legacy/icon-svg.168b89d5.svg',
      color: '#1D9BF0'
    },
    {
      $tag: 'link',
      rel : 'shortcut icon',
      href: '//abs.twimg.com/favicons/twitter.2.ico'
    },
    {
      $tag: 'link',
      rel  : 'apple-touch-icon',
      sizes: '192x192',
      href : 'https://abs.twimg.com/responsive-web/client-web-legacy/icon-ios.b1fc7275.png'
    }
  ])
})
