# </​hypertag> [![npm-version-badge][]]() [![npm-license-badge][]]()

> The fastest HTML tag and attributes parser.

**hypertag** is an HTML tag parser built for speed. Use it to find specific HTML tags and their attributes in HTML documents. It’s like a superfast `getElementsByTagName` without the DOM.

## ✨ Features
  + ✅  **Hyperfast.** 50 × faster than cheerio, 30 × parse5, 10 × htmlparser2.
  + ✅  **Tiny.** < 700 bytes gzipped.
  + ✅  **Complete** Zero dependencies.
  + ✅  **Robust.** 100% Code Coverage. [![ci-badge]][ci-link]

## 📦 Install

```sh
npm install hypertag
```

## 💻 Use
```js
import parse from 'hypertag'          // ESM
// const parse = require('hypertag')  // CommonJS

const html = `
  <html><head>
    <meta name="hello" content="world">
    <meta name="hello" content="moon">
  </head><body>
    <div><h1>Hello, world!</h1></div>
  </body></html>
`

const result = parse(html, 'meta')
console.log(result)

[
  {
    '<' : 'meta',
    name: 'hello',
    content: 'world'
  },
  {
    '<' : 'meta',
    name: 'hello',
    content: 'moon'
  }
]
```

### Examples

#### Getting Favicons

```js
const result = parse(html, 'link')
  .filter(({rel}) => /^(shortcut\s+)?icon/i.test(rel ?? ''))

[
  {
    '<': 'link',
    rel: 'icon',
    href: 'favicon.png',
    sizes: '16x16'
    type: 'image/png'
  }
]
```

#### Getting OpenGraph Images
```js
const result = parse(html, 'meta')
  .filter(({property}) => property?.toLowerCase() === 'og:image')

[
  {
    '<': 'meta',
    property: 'og:image',
    content: 'http://static01.nyt.com/images/2015/02/19/arts/international/19iht-btnumbers19A/19iht-btnumbers19A-facebookJumbo-v2.jpg'
  }
]
```

## 🧩 Recipes — modern runtimes

Because hypertag is zero-dependency, tiny, and needs no DOM, it runs anywhere JavaScript does — including edge runtimes where `cheerio`/`jsdom` won't fit. Examples use the ESM `import`; swap for `const parse = require('hypertag')` under CommonJS.

#### Cloudflare Workers / Vercel Edge — link-preview metadata

```js
import parse from 'hypertag'

export default {
  async fetch(request) {
    const target = new URL(request.url).searchParams.get('url')
    const html = await fetch(target).then(res => res.text())

    const og = Object.fromEntries(
      parse(html, 'meta')
        .filter(m => m.property?.startsWith('og:'))
        .map(m => [m.property.slice(3), m.content])
    )

    return Response.json(og) // { title, image, description, ... }
  }
}
```

No `nodejs_compat`, no bundler, no polyfill — hypertag is a single dependency-free module.

#### Next.js — Route Handler (App Router)

```js
// app/api/preview/route.js
import parse from 'hypertag'

export const runtime = 'edge' // optional; runs on Node too

export async function GET(request) {
  const url = new URL(request.url).searchParams.get('url')
  const html = await fetch(url).then(res => res.text())

  const meta = parse(html, 'meta')
  const pick = key => meta.find(m => m.name === key || m.property === key)?.content

  return Response.json({
    title: pick('og:title'),
    description: pick('description') ?? pick('og:description'),
    image: pick('og:image')
  })
}
```

#### Deno / Bun — favicon discovery

```js
import parse from 'npm:hypertag' // Deno; on Bun: import parse from 'hypertag'

const html = await fetch('https://example.com').then(res => res.text())

const icons = parse(html, 'link')
  .filter(({rel}) => /\bicon\b/i.test(rel ?? ''))

console.log(icons)
```

# Benchmarks 🍏🍊
Run benchmarks with
```sh
$ ./benchmark.js
```
#### Benchmark Design

The tested packages all do different things and have their strengths in different areas, so the benchmark by design compares apples to oranges.

The question this benchmark aims to answer is

> How fast can I find tags of interest in an HTML string?

Most of the tested parsers come with many more features and allow you to do more complex queries than hypertag; for example, parse5 and cheerio create a whole DOM, and similarly html-parse-stringify creates an AST. html-tag-parser parses tags but not attributes.

One objection could be that this is an unfair test, since the parsers are just too different. This can be rebutted by the fact that one ought to pick the right tool for the job: a sports car is faster than a truck, but the truck can load more freight. Do you need a fast and simple parser to find a few tags or do you want to manipulate a DOM?

For this benchmark, we load a pretty "standard" web page (specifically, apple.com) and the let each of the parsers parse the HTML.

#### Results
```sh
hypertag x 10,248 ops/sec ±0.78% (88 runs sampled)
fast-html x 980 ops/sec ±1.36% (87 runs sampled)
parse5 x 323 ops/sec ±1.68% (83 runs sampled)
htmlparser2 x 1,079 ops/sec ±0.87% (88 runs sampled)
html-tag-parser x 1,482 ops/sec ±0.71% (91 runs sampled)
cheerio x 182 ops/sec ±5.20% (70 runs sampled)
html-parse-stringify x 499 ops/sec ±1.07% (87 runs sampled)
Fastest is hypertag
```

[npm-version-badge]:    https://flat.badgen.net/npm/v/hypertag
[npm-license-badge]:    https://flat.badgen.net/npm/license/hypertag
[ci-badge]:             https://img.shields.io/github/actions/workflow/status/andreaspitzer/hypertag/ci.yml?branch=master&style=flat-square&label=CI
[ci-link]:              https://github.com/andreaspitzer/hypertag/actions/workflows/ci.yml
