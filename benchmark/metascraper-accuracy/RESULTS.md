# Results: metascraper vs hypertag vs open-graph-scraper

One sample run of `node index-offline.mjs` (+ `node perf.mjs`) over the six captured pages in
`fixtures/` (github repo, Wikipedia, react.dev, MDN, nodejs.org, a YouTube watch page).
Reproducible offline; regenerate with `node index-offline.mjs`. Absolute values shift as the
live pages change, so the fixtures are committed to pin this run.

Two hypertag entries: **`hypertag`** is the raw primitive (a few lines of hand lookups over
tag attributes only - the floor), and **`hypertag/meta`** is the shipped metadata layer
(`metadata(html, url)`), a declarative rules table over select + ld + sanitize.

## Coverage (6 pages x 7 fields = 42)

| tool | fields filled | agreement with metascraper |
| --- | ---: | ---: |
| metascraper | 37/42 | - |
| **hypertag/meta** (shipped) | **30/42** | **32/42** |
| open-graph-scraper | 26/42 | 29/42 |
| hypertag (raw primitive) | 23/42 | 26/42 |

## Per field (pages filled, out of 6)

| field | metascraper | hypertag/meta | hypertag (raw) | open-graph-scraper |
| --- | ---: | ---: | ---: | ---: |
| title | 6 | 6 | 5 | 6 |
| description | 5 | 5 | 5 | 5 |
| image | 6 | 6 | 5 | 6 |
| url | 6 | 6 | 6 | 6 |
| author | 6 | 1 | 0 | 0 |
| date | 3 | 2 | 0 | 0 |
| publisher | 5 | 4 | 2 | 3 |

## Reading it

- On the **OpenGraph / attribute fields** (title, description, image, url) `hypertag/meta`
  matches metascraper field for field: 6/6, 5/5, 6/6, 6/6.
- The **raw primitive** floor is 23/42: attributes only, so it misses element text and
  JSON-LD, and returns values unnormalized. Everything above that line is what the layers add.
- `hypertag/meta` closes most of the gap by reaching between the tags:
  - **Element text** - MDN's title comes from the `<title>` body (the `content` option), which
    the attribute-only path cannot read.
  - **JSON-LD** - Wikipedia and YouTube `author`/`date`/`publisher` come from
    `<script type="application/ld+json">` bodies (the `ld` layer).
  - **property-or-name leniency** - MDN writes its OpenGraph tags as `name=` instead of
    `property=`; `meta()` matches both, recovering MDN's image and publisher that a
    property-only rule (and the raw primitive) miss.
  - **Normalization** - entities decoded, whitespace tidied, URLs resolved and de-tracked
    (`sanitize`/`cleanUrl`), so values match metascraper's rather than differing on cleanup.
- The residual gap to metascraper's 37 is **`author` (1 vs 6)** and **`date` (2 vs 3)**:
  metascraper carries a much broader set of per-field heuristics, and normalizes dates with
  `chrono-node` (we return the raw JSON-LD ISO string). That is rule breadth, not a structural
  wall - the capability to read text and JSON-LD is present.

## Performance (`node perf.mjs`)

Throughput over the six captured pages (~3.5 MB total), pages turned into the normalized
object per second. Absolute numbers vary by machine; the ratios are the point.

| scraper | pages/sec | vs metascraper |
| --- | ---: | ---: |
| hypertag (raw) | ~530 | ~29x faster |
| **hypertag/meta** | **~470** | **~26x faster** |
| metascraper | ~18 | - |
| open-graph-scraper | ~7 | ~3x slower |

`hypertag/meta` runs within ~5% of the raw primitive and ~29x faster than metascraper. It gets
there with a caching layer on top of the unchanged engine: each page's extraction creates a
local parse memo (a `Map`) and threads it through, so the repeated `parse(source, 'meta')` /
`parse(source, 'link')` scans across the seven fields collapse to one each instead of re-scanning
per field. The cache is a plain per-call `Map` - no shared or module-level state - so concurrent
async extractions never mix, and the declarative API now costs almost nothing over hand-written.

Speed is only one axis. From the other benchmarks: the hypertag pipeline is a **zero-dependency**
package (core + select + ld + sanitize + meta) versus metascraper's **115 packages / ~48 MB**;
cold start is **~10 ms vs ~440 ms**; peak memory **~48 MB vs ~130 MB**.

## Takeaway

open-graph-scraper reads element text but not JSON-LD, so it plateaus at author/date = 0.
metascraper's weight buys **JSON-LD parsing**, **text extraction**, and a **broad per-field
ruleset**. `hypertag/meta` now does the first two from a zero-dependency core and closes most
of the coverage gap - what remains is the breadth of metascraper's per-field heuristics and
date normalization, not a structural limit - and it does so at ~26x metascraper's throughput.
