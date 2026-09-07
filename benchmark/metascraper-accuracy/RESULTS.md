# Results: metascraper vs hypertag vs open-graph-scraper

One sample run of `node index-offline.mjs` over the six captured pages in `fixtures/`
(github repo, Wikipedia, react.dev, MDN, nodejs.org, a YouTube watch page). Reproducible
offline; regenerate with `node index-offline.mjs`. Absolute values shift as the live pages
change, so the fixtures are committed to pin this run.

## Coverage (6 pages x 7 fields = 42)

| tool | fields filled |
| --- | ---: |
| metascraper | 37/42 |
| open-graph-scraper | 26/42 |
| hypertag (hand-written rule layer) | 23/42 |

## Per field (pages filled, out of 6)

| field | metascraper | hypertag | open-graph-scraper |
| --- | ---: | ---: | ---: |
| title | 6 | 5 | 6 |
| description | 5 | 5 | 5 |
| image | 6 | 5 | 6 |
| url | 6 | 6 | 6 |
| author | 6 | 0 | 0 |
| date | 3 | 0 | 0 |
| publisher | 5 | 2 | 3 |

## Reading it

- On the **OpenGraph / attribute fields** (title, description, image, url) hypertag keeps
  pace: 5-6 of 6 pages, matching metascraper's values.
- Two structural cliffs it falls off:
  1. **JSON-LD**: `author` and `date` are 0/6 for hypertag *and* for open-graph-scraper -
     both are tag readers, and those fields live in `<script type="application/ld+json">`
     bodies that only metascraper parses. This is the biggest gap.
  2. **Element text**: on MDN the title/image are only in `<title>` / JSON-LD, not OG, so
     hypertag misses them. open-graph-scraper gets the title (6/6) because it is cheerio-based
     and reads element text; hypertag, attribute-only, cannot.
- The only two cases where hypertag produced a *different* value than metascraper are
  **normalization, not wrong content**: hypertag returned the raw `og:image` with its
  `?utm_source=...` tracking query and an undecoded `&amp;` (Wikipedia), and a raw ` ...`
  where metascraper decoded `…` (YouTube). metascraper cleans URLs and decodes HTML entities.

## Takeaway

open-graph-scraper sits between the two: like hypertag it cannot read JSON-LD (author/date =
0), but unlike hypertag it reads element text. metascraper's weight buys exactly two things
over a raw-tag reader here - **JSON-LD parsing** and **text extraction / normalization**. On
plain OpenGraph tags, the 22 kB zero-dependency reader is even with it.
