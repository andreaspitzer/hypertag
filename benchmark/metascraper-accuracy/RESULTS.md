# Results: metascraper vs hypertag vs open-graph-scraper

One sample run of `node index-offline.mjs` over the six captured pages in `fixtures/`
(github repo, Wikipedia, react.dev, MDN, nodejs.org, a YouTube watch page). Reproducible
offline; regenerate with `node index-offline.mjs`. Absolute values shift as the live pages
change, so the fixtures are committed to pin this run.

## Coverage (6 pages x 7 fields = 42)

| tool | fields filled | agreement with metascraper |
| --- | ---: | ---: |
| metascraper | 37/42 | - |
| open-graph-scraper | 26/42 | 29/42 |
| hypertag (raw rule layer) | 23/42 | 26/42 |
| hypertag + `hypertag/sanitize` | 23/42 | 27/42 |
| hypertag + sanitize + `{content: true}` | **28/42** | **30/42** |

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
- The cases where raw hypertag produced a *different* value than metascraper are
  **normalization, not wrong content**: it returned the raw `og:image` with its
  `?utm_source=...` tracking query and an undecoded `&amp;` (Wikipedia), and a raw ` ...`
  where metascraper's title cleanup emits `…` (YouTube). metascraper cleans URLs and decodes
  HTML entities.

## What `hypertag/sanitize` changes

Running the same rule layer's output through `hypertag/sanitize` (entity-decode + whitespace
tidy on text, `cleanUrl` on URLs) lifts agreement from **26 to 27**. It is a **quality** gain,
not a coverage one - sanitize cleans the values hypertag already has, it does not find new
ones, so `author`/`date` stay 0 (JSON-LD) and coverage stays 23/42. Concretely:

- **Wikipedia image now matches metascraper**: `cleanUrl` strips the `?utm_*` tracking params
  and `decode` turns `&amp;` into `&`.
- **The MDN description keeps its newline**: `sanitize` collapses runs of *horizontal*
  whitespace but preserves line breaks, so it matches metascraper (which keeps the `\n`) and
  stays faithful to the source. An earlier `\s+`->space rule flattened that newline; this
  benchmark is what caught it.
- The residual YouTube `…` difference is metascraper's title *prettification* (trailing `...`
  -> `…`), which hypertag deliberately does not do - it returns what the page said.

## What the `{content: true}` option changes

Adding the core `content` option (capture the text between the tags) lets the rule layer read
the two things that were structurally out of reach - and it moves the numbers accordingly:
**28/42 coverage, 30/42 agreement**, ahead of open-graph-scraper. The five recovered fields
are exactly the between-the-tags kind:

- **MDN title** from the `<title>` element text (was missed; now matches metascraper).
- **Wikipedia author, date, publisher** and **YouTube date** from JSON-LD `<script>` bodies.

Three of the five match metascraper exactly. The two dates are *covered but formatted
differently*: we return the raw JSON-LD ISO string, metascraper normalizes dates with
`chrono-node`. The remaining gap to metascraper's 37 is mostly `author` (it fills 6/6 via a
much richer set of author heuristics; our small rule layer finds it in JSON-LD on one page) -
that is rule-layer sophistication and date normalization, not a hypertag capability limit. The
capability - reading element text and JSON-LD - is now present.

## Performance (`node perf.mjs`)

Throughput over the six captured pages (~3.5 MB total), pages turned into the normalized
object per second. Absolute numbers vary by machine; the ratios are the point.

| scraper | pages/sec | vs metascraper |
| --- | ---: | ---: |
| hypertag + sanitize | ~490 | ~35x faster |
| hypertag (raw) | ~470 | ~34x faster |
| hypertag + sanitize + `{content: true}` | ~400 | **~29x faster** |
| open-graph-scraper | ~6 | ~2x slower |
| metascraper | ~14 | - |

The accuracy work is essentially free: the full pipeline that reaches 30/42 - parse + select +
sanitize + `content` + JSON-LD `JSON.parse` - still runs ~29x faster than metascraper. The
`content` variant is ~15% slower than raw hypertag (the extra content passes and JSON parsing);
raw vs sanitize is within measurement noise.

Speed is only one axis. From the other benchmarks (same libraries, unchanged): the hypertag
pipeline is the **zero-dependency** package (core + `hypertag/sanitize`) versus metascraper's
**115 packages / ~48 MB**; cold start is **~10 ms vs ~440 ms**; peak memory **~48 MB vs ~130 MB**.

## Takeaway

open-graph-scraper reads element text but not JSON-LD, so it plateaus at author/date = 0.
metascraper's weight buys **JSON-LD parsing** and **text extraction / normalization**. With
the `content` option plus the ~1.3 kB sanitize layer, hypertag now does both from a
zero-dependency core - closing most of the gap; what remains is the breadth of metascraper's
per-field rules, not a structural wall.
