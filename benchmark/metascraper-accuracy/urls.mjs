// Pages to compare across scrapers. metascraper's original list was seven 2015-2016 news
// articles, all long since dead or bot-walled. These are durable, metadata-rich pages that
// should stay live. Swap in your own URLs (news articles, product pages, blog posts) - the
// interesting cases are pages where metadata hides in element text or JSON-LD, where a
// raw-tag reader like hypertag falls behind.
export default [
  'https://react.dev/',
  'https://vuejs.org/',
  'https://nodejs.org/en',
  'https://developer.mozilla.org/en-US/docs/Web/HTTP',
  'https://en.wikipedia.org/wiki/HTML',
  'https://web.dev/',
  'https://github.com/microlinkhq/metascraper'
]
