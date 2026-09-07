# metascraper accuracy benchmark (with hypertag)

Adapted from metascraper's own benchmark
([microlinkhq/metascraper/tree/master/benchmark](https://github.com/microlinkhq/metascraper/tree/master/benchmark)),
which fetches real pages, runs several metadata scrapers, normalizes each to a common shape,
and dumps the results for comparison. This version:

- **adds hypertag** (a hand-written rule layer over the raw tags) as a scraper,
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

- `results/<scraper>.json` - each scraper's normalized output per page, for eyeballing.
- **coverage** - how many of the `pages x 7` fields each scraper filled. metascraper draws on
  OpenGraph, Twitter, JSON-LD and HTML text; hypertag reads tag **attributes only**.
- **agreement with metascraper** - where the others produce the identical value.

The expected story: on pages whose metadata lives in tags, hypertag keeps pace; on pages where
it lives in element **text** (a `<title>` body, a visible headline) or **JSON-LD** (author,
date), hypertag cannot reach it and metascraper pulls ahead. That gap is the point of the
comparison, not a bug - hypertag is an attribute reader, not a metadata ruleset.
