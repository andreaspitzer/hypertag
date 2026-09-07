# </​hypertag> [![npm-version-badge][]]() [![npm-license-badge][]]()

> **The smallest, fastest HTML parser that skips the DOM.**

**hypertag** parses an HTML string and returns the tag attributes you ask for as plain objects: a `getElementsByTagName` that needs no DOM. Zero dependencies, about 0.8 kB, and in the benchmark below the fastest and smallest way to pull `<meta>`, `<link>`, and other tags out of HTML. Runs on Node, Deno, Bun, and the edge.

## ✨ Features
  + ✅  **Tiny.** ~0.8 kB bundled, 35x smaller than htmlparser2 and ~1000x smaller than jsdom, so it barely touches an edge bundle.
  + ✅  **Zero dependencies.** Nothing to audit, break, or bloat your tree.
  + ✅  **Just the tags.** Name the tags you want, get their attributes back as plain objects. No DOM, no selectors to learn.
  + ✅  **Fast and light.** 2.6x faster than node-html-parser and up to 95x faster than the DOM parsers, and it builds no tree so it retains almost no memory.
  + ✅  **Auditable.** One small file you can read in a minute, 100% test coverage. [![ci-badge]][ci-link]

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

## 🧩 Recipes for modern runtimes

Because hypertag is zero-dependency, tiny, and needs no DOM, it runs anywhere JavaScript does, including edge runtimes where `cheerio`/`jsdom` won't fit. Examples use the ESM `import`; swap for `const parse = require('hypertag')` under CommonJS.

#### Cloudflare Workers / Vercel Edge: link-preview metadata

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

No `nodejs_compat`, no bundler, no polyfill. hypertag is a single dependency-free module.

#### Next.js: Route Handler (App Router)

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

#### Deno / Bun: favicon discovery

```js
import parse from 'npm:hypertag' // Deno; on Bun: import parse from 'hypertag'

const html = await fetch('https://example.com').then(res => res.text())

const icons = parse(html, 'link')
  .filter(({rel}) => /\bicon\b/i.test(rel ?? ''))

console.log(icons)
```

## 🎯 Selectors (opt-in)

The core stays selector-free. If you want CSS-like sugar, import the separate
`hypertag/select` entry: it compiles a single-tag selector into exactly the `parse` +
`.filter()` you would have written by hand, and nothing more (no tree, no DOM, no combinators).

```js
import select from 'hypertag/select'          // ESM
// const select = require('hypertag/select')  // CommonJS

select(html, 'link[rel=alternate]')
// ≡ parse(html, 'link').filter(({rel}) => rel === 'alternate')
```

Compile once and reuse across many documents (mirrors `extend`):

```js
import {compile} from 'hypertag/select'

const alternates = compile('link[rel=alternate]')  // source => Tag[]
alternates(htmlA)
alternates(htmlB)
```

A selector is a tag name (`link`, `*`, or omitted = `*`) followed by any number of
attribute clauses, AND-combined: `link[rel=alternate][hreflang]`. Supported operators:

| clause | matches |
| --- | --- |
| `[attr]` | attribute is present (valueless or empty counts) |
| `[attr=v]` | value equals `v` |
| `[attr!=v]` | value differs from `v`, or the attribute is absent |
| `[attr^=v]` | value starts with `v` |
| `[attr$=v]` | value ends with `v` |
| `[attr*=v]` | value contains `v` |
| `[attr~=v]` | `v` is one of the whitespace-separated words in the value |
| `[attr\|=v]` | value equals `v` or starts with `v-` (e.g. `en` matches `en-GB`) |

Values may be unquoted, single-, or double-quoted; the three are equivalent (`[rel=alternate]`
≡ `[rel="alternate"]`). Unquoted values are matched a little more loosely than a strict CSS
tokenizer would allow (e.g. `[property=og:image]` is accepted without quotes). Matching is
case-sensitive. Combinators (` `, `>`, `+`), comma groups, and `.class`/`#id` shorthands are
**not** supported — hypertag builds no tree — and a selector using them throws a `TypeError`
rather than matching silently.

## 🚫 When not to reach for hypertag

hypertag is an extraction primitive, not a full parser. Its core has no CSS selectors (the
opt-in `hypertag/select` layer above only sugars single-tag attribute filtering), no DOM
traversal, and it does not repair malformed or badly nested HTML the way a spec parser does. It does not fetch URLs; you hand it an HTML string you already have. And it is not a metadata ruleset: it returns the raw `<meta>` and `<link>` tags, not the JSON-LD, Twitter Card, and oEmbed fallbacks that tools like metascraper layer on top. If you need any of those, reach for cheerio, jsdom, or metascraper.

# Benchmarks 🍏🍊

Every number here is reproducible. The comparison parsers live in `benchmark/`, isolated from the package:

```sh
cd benchmark && npm install && npm run bench
```

The task is identical for every library: from a real 90 kB page, pull every `<meta>` and `<link>` tag with its attributes (all nine return the same 79 tags). One sample run on Node 24 is shown below; absolute numbers vary by machine, the ratios are the point.

Sorted by speed. Every metric is shown as a multiple of hypertag, so 1x is best and anything higher is worse.

| parser | speed | bundle size | peak memory |
| --- | --- | --- | --- |
| **hypertag** | **11,742 ops/s · 1x** | **0.8 kB · 1x** | **49.9 MB · 1x** |
| node-html-parser | 4,444 · 2.6x slower | 82.9 kB · 106x | 63.2 MB · 1.3x |
| htmlparser2 | 2,941 · 4.0x slower | 27.6 kB · 35x | 59.0 MB · 1.2x |
| html5parser | 2,232 · 5.3x slower | 2.4 kB · 3x | 57.1 MB · 1.1x |
| domino | 1,980 · 5.9x slower | 90.4 kB · 115x | 81.8 MB · 1.6x |
| linkedom | 1,031 · 11x slower | 94.6 kB · 121x | 72.8 MB · 1.5x |
| parse5 | 513 · 23x slower | 47.2 kB · 60x | 83.7 MB · 1.7x |
| cheerio | 353 · 33x slower | 489 kB · 625x | 166.3 MB · 3.3x |
| jsdom | 123 · 95x slower | 775 kB · 989x | 240.9 MB · 4.8x |

The sharpest single number is retained heap: hypertag keeps ~0 MB (it holds no tree) versus 74.5 MB for jsdom. See [benchmark/](benchmark/) for that column and the method.

hypertag wins by doing less: it scans the string once and returns plain objects, with no DOM or tree to build and hold. That is also the tradeoff. If you need selectors, text content, traversal, or mutation, reach for node-html-parser or cheerio (see **When not to reach for hypertag** above). Most run at the edge too (cheerio needs a Node-compat flag); they just cost more to ship.

[npm-version-badge]:    https://flat.badgen.net/npm/v/hypertag
[npm-license-badge]:    https://flat.badgen.net/npm/license/hypertag
[ci-badge]:             https://img.shields.io/github/actions/workflow/status/andreaspitzer/hypertag/ci.yml?branch=master&style=flat-square&label=CI
[ci-link]:              https://github.com/andreaspitzer/hypertag/actions/workflows/ci.yml
