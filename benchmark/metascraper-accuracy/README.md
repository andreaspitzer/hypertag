# metascraper accuracy benchmark (with hypertag)

Adapted from metascraper's own benchmark
([microlinkhq/metascraper/tree/master/benchmark](https://github.com/microlinkhq/metascraper/tree/master/benchmark)),
which fetches real pages, runs several metadata scrapers, normalizes each to a common shape,
and dumps the results for comparison. This version:

- **adds two hypertag entries** - `hypertag` (the raw primitive: a few hand lookups over tag
  attributes) and `hypertag/meta` (the shipped metadata layer: `metadata(html, url)` over
  select + ld + sanitize) - as scrapers,
- **modernizes** the metascraper entry to the current factory API,
- **refreshes the URLs** (the original seven were dead 2015-2016 articles),
- swaps the original's unmaintained libraries (html-metadata, node-metainspector, unfluff) for
  **open-graph-scraper** as the extra lightweight comparison,
- adds per-page error handling and a **coverage + agreement summary**.

The shared shape is `{title, description, image, url, author, date, publisher}`.

## Two ways to run

### Online (needs open network)

```sh
npm install
npm start          # fetches urls.mjs, runs scrapers, writes results/, prints summary
```

### Offline (from saved fixtures)

For a reproducible run with no network - and the only way to run it in a sandboxed
environment - capture each page's **raw server HTML** and run against that:

```sh
# save each page's RAW HTML (NOT the browser-rendered DOM - a non-rendering scraper
# only ever sees the server HTML, so that is the fair input):
curl -L 'https://github.com/microlinkhq/metascraper' -o fixtures/github-metascraper.html
# ...one per entry in fixtures.mjs, named fixtures/<slug>.html

npm install
node index-offline.mjs
```

`fixtures.mjs` maps each `<slug>` to its real URL (used to resolve relative image/canonical
URLs). Missing fixtures are skipped, so you can start with a few and add more.

## Reading the results

- `results/<scraper>.json` - each scraper's normalized output per page, for eyeballing. The
  `hypertag/meta` scraper writes `results/hypertag-meta.json` (the slash is slugified).
- **coverage** - how many of the `pages x 7` fields each scraper filled. metascraper draws on
  OpenGraph, Twitter, JSON-LD and HTML text; `hypertag/meta` draws on the same sources via its
  layers, while raw `hypertag` reads tag **attributes only**.
- **agreement with metascraper** - where the others produce the identical value.

The story: the raw `hypertag` primitive keeps pace on tag-attribute fields but cannot reach
metadata in element **text** (a `<title>` body) or **JSON-LD** (author, date). `hypertag/meta`
reaches both (the `content` option + the `ld` layer), matching metascraper on title/image/url
and closing most of the gap; what remains is the **breadth** of metascraper's per-field
heuristics (author, date normalization), not a structural wall. See `RESULTS.md` for a run.
