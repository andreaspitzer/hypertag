// Scrapers, each normalized to the same shape metascraper's benchmark used:
// {title, description, image, url, author, date, publisher}. Structure mirrors the original
// scrapers.js (an array of named scrapers with a normalize step); the metascraper entry is
// modernized to the current factory API, hypertag is added, and open-graph-scraper stands in
// for the original's other libraries (html-metadata / node-metainspector / unfluff are
// unmaintained and left out - add them back as entries here if you want them).
import parse from 'hypertag'
import {cleanUrl, decode, sanitize} from 'hypertag/sanitize'
import metascraperFactory from 'metascraper'
import metascraperAuthor from 'metascraper-author'
import metascraperDate from 'metascraper-date'
import metascraperDescription from 'metascraper-description'
import metascraperImage from 'metascraper-image'
import metascraperPublisher from 'metascraper-publisher'
import metascraperTitle from 'metascraper-title'
import metascraperUrl from 'metascraper-url'

export const FIELDS = ['title', 'description', 'image', 'url', 'author', 'date', 'publisher']

const metascraper = metascraperFactory([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperUrl(),
  metascraperAuthor(),
  metascraperDate(),
  metascraperPublisher()
])

export default [
  {
    name: 'metascraper',
    async run(url, html) {
      const r = await metascraper({html, url})
      return {
        title: r.title,
        description: r.description,
        image: r.image,
        url: r.url,
        author: r.author,
        date: r.date,
        publisher: r.publisher
      }
    }
  },

  {
    // hypertag has no metadata ruleset; this is a hand-written rule layer over the raw tags -
    // the fallback order and relative-URL resolution you would write yourself. It reads tag
    // ATTRIBUTES only, so anything living in element TEXT (a <title> body, JSON-LD in a
    // <script>) is unreachable, and it does not decode HTML entities.
    name: 'hypertag',
    async run(url, html) {
      const metas = parse(html, 'meta')
      const links = parse(html, 'link')
      const prop = v => metas.find(m => (m.property || '').toLowerCase() === v)?.content
      const name = v => metas.find(m => (m.name || '').toLowerCase() === v)?.content
      const rel = v => links.find(l => (l.rel || '').toLowerCase() === v)?.href
      const abs = x => {
        if (x == null) return null
        try {
          return new URL(x, url).href
        } catch {
          return x
        }
      }
      return {
        title: prop('og:title') ?? name('twitter:title') ?? null, // no access to <title> text
        description: prop('og:description') ?? name('description') ?? name('twitter:description') ?? null,
        image: abs(prop('og:image') ?? name('twitter:image')),
        url: prop('og:url') ?? rel('canonical') ?? null,
        author: name('author') ?? prop('article:author') ?? null,
        date: prop('article:published_time') ?? name('date') ?? null,
        publisher: prop('og:site_name') ?? null
      }
    }
  },

  {
    // Same rule layer as `hypertag`, but its output is run through hypertag/sanitize: text
    // fields are entity-decoded + whitespace-collapsed, URL fields are decoded then cleaned
    // (relative resolved, credentials / utm_* / #:~:text= stripped). This closes the
    // normalization gap with metascraper; it does NOT add coverage (JSON-LD author/date and
    // text-only titles are still out of reach - sanitize cleans values, it does not find new ones).
    name: 'hypertag+sanitize',
    async run(url, html) {
      const metas = parse(html, 'meta')
      const links = parse(html, 'link')
      const prop = v => metas.find(m => (m.property || '').toLowerCase() === v)?.content
      const name = v => metas.find(m => (m.name || '').toLowerCase() === v)?.content
      const rel = v => links.find(l => (l.rel || '').toLowerCase() === v)?.href
      const text = v => (v == null ? null : sanitize(v))
      const link = v => (v == null ? null : cleanUrl(decode(v), url))
      return {
        title: text(prop('og:title') ?? name('twitter:title')),
        description: text(prop('og:description') ?? name('description') ?? name('twitter:description')),
        image: link(prop('og:image') ?? name('twitter:image')),
        url: link(prop('og:url') ?? rel('canonical')),
        author: text(name('author') ?? prop('article:author')),
        date: prop('article:published_time') ?? name('date') ?? null,
        publisher: text(prop('og:site_name'))
      }
    }
  },

  {
    // open-graph-scraper, imported lazily so an API mismatch fails only this scraper, not the
    // whole run. It also reads tags (not JS-rendered content), a lighter comparison point.
    name: 'open-graph-scraper',
    async run(_url, html) {
      const {default: ogs} = await import('open-graph-scraper')
      const {result} = await ogs({html})
      const firstUrl = list => (Array.isArray(list) && list[0] ? list[0].url : null)
      return {
        title: result.ogTitle ?? result.twitterTitle ?? null,
        description: result.ogDescription ?? result.twitterDescription ?? null,
        image: firstUrl(result.ogImage) ?? firstUrl(result.twitterImage),
        url: result.ogUrl ?? null,
        author: result.articleAuthor ?? result.author ?? null,
        date: result.articlePublishedTime ?? null,
        publisher: result.ogSiteName ?? null
      }
    }
  }
]
