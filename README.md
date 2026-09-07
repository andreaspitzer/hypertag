# </​hypertag> [![npm-version-badge][]]() [![npm-license-badge][]]()

> The fastest HTML tag and attributes parser.

**hypertag** is an HTML tag parser built for speed. Use it to find specific HTML tags and their attributes in HTML documents. It’s like a superfast `getElementsByTagName` without the DOM.

## ✨ Features
  + ✅  **Hyperfast.** 50 × faster than cheerio, 30 × parse5, 10 × htmlparser2.
  + ✅  **Tiny.** < 500 bytes gzipped.
  + ✅  **Complete** Zero dependencies.
  + ✅  **Robust.** 100% Code Coverage. [![ci-badge]][ci-link]

## 💻 Use
```js
const html = `
  <html><head>
    <meta name="hello" content="world">
    <meta name="hello" content="moon">
  </head><body>
    <div><h1>Hello, world!</h1></div>
  </body></html>
`

const result = parseHtmlTags(html, 'meta')
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
const result = parseHtmlTags(html, 'link')
  .filter(({rel}) => /^(shortcut\s+)?icon/i.test(rel))

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
const result = parseHtmlTags(html, 'meta')
  .filter(({property}) => property.toLowerCase() === 'og:image')

[
  {
    '<': 'meta',
    property: 'og:image',
    content: 'http://static01.nyt.com/images/2015/02/19/arts/international/19iht-btnumbers19A/19iht-btnumbers19A-facebookJumbo-v2.jpg'
  }
]
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

Most of the tested parsers come with many more features and allow you to do more complex queries than hypertag; for example, parse5 and cheerio create a whole DOM, and similarly html-parse-stringify2 creates an AST. html-tag-parser parses tags but not attributes.

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
html-parse-stringify2 x 499 ops/sec ±1.07% (87 runs sampled)
Fastest is hypertag
```

[npm-version-badge]:    https://flat.badgen.net/npm/v/hypertag
[npm-license-badge]:    https://flat.badgen.net/npm/license/hypertag
[ci-badge]:             https://img.shields.io/github/actions/workflow/status/andreaspitzer/hypertag/ci.yml?branch=master&style=flat-square&label=CI
[ci-link]:              https://github.com/andreaspitzer/hypertag/actions/workflows/ci.yml
