// Manifest for the OFFLINE run (index-offline.mjs): maps each saved fixture to the real page
// URL it came from. The URL matters - metascraper and hypertag both resolve relative image /
// canonical URLs against it. Save each page's RAW server HTML (see README) to
// fixtures/<slug>.html, then run `node index-offline.mjs`. Missing fixtures are skipped, so
// you can start with a few. Add or swap entries freely (e.g. a current news article, which is
// where JSON-LD author/date make metascraper pull ahead).
export default [
  {slug: 'github-metascraper', url: 'https://github.com/microlinkhq/metascraper'},
  {slug: 'wikipedia-html', url: 'https://en.wikipedia.org/wiki/HTML'},
  {slug: 'react-dev', url: 'https://react.dev/'},
  {slug: 'mdn-http', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP'},
  {slug: 'nodejs', url: 'https://nodejs.org/en'},
  {slug: 'youtube-video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}
]
