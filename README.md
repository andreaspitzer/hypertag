# &lt;/hypertag&gt; [![npm-version-badge][]]() [![npm-license-badge][]]()

> **The fastest, edge-ready way to pull link-preview tags from HTML (OpenGraph, `<meta>` and others) – no DOM, zero dependencies, lowest-memory, all in just \~5 kB.**

You're building a link-preview (unfurl) endpoint, and it has to run on an edge runtime – a Cloudflare Worker, Deno Deploy, a Vercel Edge function. The job itself is narrow: pull a dozen fields – the Open Graph and other meta tags, a little JSON-LD – out of the `<head>`. But a full DOM parser is a lot to bring to it – hundreds of kilobytes to ship, and a whole document tree built and held in memory on every request. What you want is something that stays small, starts fast, and leaves nothing behind between requests.

**hypertag** does exactly that job: give it a URL – or HTML you already fetched – and get the link-preview card back as a plain object: title, description, image, icon and 17 more fields, read from OpenGraph, Twitter cards and JSON-LD. One pass per tag type, no tree, no DOM. Zero dependencies, about 5 kB, no `nodejs_compat` flag, and it holds essentially no memory between requests. Runs on Node, Deno, Bun, and every edge runtime.

Under the extractor is a general HTML tag parser you can drop to for raw tags – `parse(html, 'meta')` → plain objects, about 0.7 kB. That floor is why the extractor stays this small; it's there when you want it, but the extractor is the point.

## 📦 Install

```sh
npm install hypertag
```

## 🔗 Build a link-preview endpoint

The whole job, on the edge, in one file. Give `fromUrl` a URL and it fetches the page and returns the card – OpenGraph → Twitter → JSON-LD fallbacks, entity decoding, relative-URL resolution, tracking-param stripping, and a best-effort favicon, all built in:

```js
import {fromUrl} from 'hypertag'

export default {
  async fetch(request) {
    const target = new URL(request.url).searchParams.get('url')
    return Response.json(await fromUrl(target))
  }
}
// GET /?url=https://example.com/article →
// {
//   title:       'How the Web Works',
//   description: 'A friendly introduction to browsers…',
//   image:       'https://example.com/cover.png',
//   url:         'https://example.com/article',
//   icon:        'https://example.com/favicon.ico',
//   author:      'Ada Lovelace',
//   date:        '2026-01-02T03:04:05Z',
//   publisher:   'Example',
//   …            // 21 fields in all
// }
```

Already fetched the HTML yourself – from a cache, a crawl, or a fetch with your own SSRF and caching rules? Hand the string straight to `metadata(html, url)` and skip the network step:

```js
import {metadata} from 'hypertag'

metadata(html, 'https://example.com/article')   // the same card, no fetch
```

Either way it's the entire dependency footprint – no DOM shim, no bundler config, no native modules. Every field is filled from the first source that carries it (OpenGraph, then Twitter cards, then JSON-LD, then a sensible HTML fallback), decoded, and resolved against the page URL – so `image` is an absolute, de-tracked URL and `title` is real text, not `Rock &amp; Roll`. A field with no source is `null`, and nothing throws on a broken page. The fields come from a default rule set that is **data you can override**: pass your own `rules` to `extract(html, url, rules)`, each field listing its sources in preference order. See the [API reference](docs/api.md).

Some pages can't be scraped at all – Twitter/X, TikTok and Instagram serve no useful HTML to a bot. `hypertag/oembed` maps those URLs to their provider's oEmbed endpoint **without** the page HTML, from a curated registry of 25 providers:

```js
import {oembedEndpoint, oembed} from 'hypertag'

const endpoint = oembedEndpoint('https://www.tiktok.com/@user/video/123')
const embed = endpoint ? await oembed(endpoint) : null   // the provider's embed markup + data
```

## 🪶 Small, fast, and low-memory

It comes down to one design choice: hypertag builds no document tree. It scans the string once and returns plain objects, so there's almost nothing to ship and nothing held in memory after it returns.

**The edge link-preview libraries.** The tools you'd actually weigh for this job – the ones that also run at the edge. Extraction speed on the same real pages, ship size gzipped, and correctness on 12 messy-but-valid cases with known-correct answers – linkpeek fetches its own HTML, so it isn't scored on the shared fixtures (the `–` cells). Reproduce with `cd benchmark && npm run bench:edge`:

| edge link-preview lib | extract speed | ship (gz) | deps | edge | correct /12 |
| --- | ---: | ---: | ---: | :---: | ---: |
| **hypertag/meta** | **1x** | **5.0 kB** | **0** | ✅ | **12** |
| openlink | 2.8x slower | 4.0 kB | 0 | ✅ | 6 |
| linkpeek | – | 26.9 kB | 1 | ✅ | – |
| open-graph-scraper-lite | \~80x slower | 630.8 kB | 3 | ⚠️ flag | 7 |

Two of these fetch the page for you (openlink, linkpeek); hypertag keeps fetching a thin opt-in layer, so you hold the network step – caching, SSRF, antibot. openlink comes closest on size (a hair under at 4.0 kB), but hypertag extracts \~2.8x faster and is the only row that gets every messy case right: numeric and accented entities, `og:` written as `name=`, `utm_*` stripping, relative-URL resolution, and a JSON-LD fallback – at zero dependencies.

**The tag parser underneath.** The \~0.7 kB `hypertag/parse` core is also the fastest and lightest way to pull raw tags. Same task for every library – from a real \~90 kB page, pull every `<meta>` and `<link>` (all nine return the same 79 tags); one sample run on Node 22, reproducible with `npm run bench`:

| parser | speed | ship (gzip) | peak memory | Workers |
| --- | ---: | ---: | ---: | :---: |
| **hypertag/parse** | **1x** | **0.7 kB** | **51.8 MB** | ✅ |
| htmlparser2 | 3.0x slower | 27.6 kB | 58.2 MB | ✅ |
| node-html-parser | 4.1x slower | 82.9 kB | 65.9 MB | ✅ |
| cheerio | 65x slower | 489.5 kB | 146.2 MB | ⚠️ flag |
| jsdom | 127x slower | 774.9 kB | 179.6 MB | ❌ |

The sharpest number is retained heap: hypertag holds about 0 MB after returning, versus 74.2 MB for jsdom. Full nine-parser table and method in [benchmark/](benchmark/).

**vs Cloudflare's HTMLRewriter.** HTMLRewriter is the Workers runtime's own HTML tool, and it's excellent at what it's for: *streaming and rewriting* HTML as it passes through a response. It can extract too, but pulling a handful of fields into an object means wiring up element handlers, accumulating text chunks, and awaiting the stream – and it stops at raw strings, with no OpenGraph → Twitter → JSON-LD fallbacks, no entity decoding, no URL resolution, and no favicon ranking. hypertag hands you the cooked card in one call, and the same code runs off-Workers too. Rewriting HTML on the way through → HTMLRewriter; reading the fields out → hypertag.

## 🧩 Parse the raw tags yourself

Under the extractor is one general function you can drop to directly. `parse(source, tags)` scans the HTML once and returns the matched tags as plain objects – a `getElementsByTagName` with no DOM. Use it when you want the raw og tags, `<link>` tags, or anything else rather than the cooked card:

```js
import parse from 'hypertag/parse'

parse('<meta name="x" content="y">', 'meta')   // [ { $tag: 'meta', name: 'x', content: 'y' } ]
parse(html, ['meta', 'link'])                   // several at once; '*' matches every tag
```

Want CSS-like filtering instead of a hand-written `.filter()`? `hypertag/select` compiles a selector into exactly that – no tree, no combinators:

```js
import select from 'hypertag/select'

select(html, 'link[rel=alternate]')             // matching <link> tags, in document order
```

`hypertag/ld` reads and flattens a page's JSON-LD blocks, and `hypertag/sanitize` decodes entities and cleans URLs. The default `hypertag` import is everything, batteries included; reach for a single layer to ship only what that job needs – bundled, minified, gzipped:

| you import | ships (gzipped) | for |
| --- | ---: | --- |
| `hypertag` | 6.6 kB | everything, batteries included |
| `hypertag/parse` | 0.7 kB | the core tag parser – any tag or attribute |
| `hypertag/ld` | 0.9 kB | JSON-LD |
| `hypertag/sanitize` | 1.4 kB | decode + clean values |
| `hypertag/oembed` | 1.4 kB | oEmbed endpoints for un-scrapeable pages |
| `hypertag/select` | 1.9 kB | CSS-like selectors + presets |
| `hypertag/meta` | 5.0 kB | the whole 21-field link-preview card |
| `hypertag/fetch` | 5.1 kB | `fromUrl`: fetch, then card |

Every signature is in the [API reference](docs/api.md).

## 🚫 When not to reach for hypertag

hypertag turns a URL – or HTML you already have – into a metadata object. It does not run JavaScript, and its tag parser builds no tree – no DOM traversal, no mutation, no repair of badly nested markup the way a spec parser does. If you need to traverse or repair a full document, that's a job for a DOM library; to rewrite HTML inline as it streams through a Worker, use a streaming HTML rewriter; and for JavaScript-rendered pages, antibot, or a broader metadata ruleset with more per-field fallbacks, a headless browser or a full metadata scraper will serve you better.

## 📖 API

Every signature, option, and return value lives in the **[API reference → `docs/api.md`](docs/api.md)** – every entry point. TypeScript types ship in the package. How the layers fit together, and why, is in [`CONTEXT.md`](CONTEXT.md).

[npm-version-badge]:    https://flat.badgen.net/npm/v/hypertag
[npm-license-badge]:    https://flat.badgen.net/npm/license/hypertag
[ci-badge]:             https://img.shields.io/github/actions/workflow/status/andreaspitzer/hypertag/ci.yml?branch=master&style=flat-square&label=CI
[ci-link]:              https://github.com/andreaspitzer/hypertag/actions/workflows/ci.yml
