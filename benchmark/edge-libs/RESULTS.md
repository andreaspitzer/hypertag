# Edge link-preview libraries vs `hypertag/meta`

The task hypertag is positioned for: **extract the link-preview fields from HTML you already
have**, on an edge runtime. This compares `hypertag/meta` against the edge-capable libraries
people actually reach for. Run it yourself:

```sh
cd benchmark/edge-libs && npm install
npm run footprint   # ship size per library
npm start           # extraction parity vs open-graph-scraper-lite, over saved fixtures
```

## Two shapes, not one category

- **Extract from HTML you have** (hypertag's core job): `hypertag/meta`, `open-graph-scraper-lite`.
  You bring the HTML; the library only parses. Apples-to-apples.
- **Fetch + extract** (a category up): `linkpeek`, `openlink` take a *URL* and fetch it themselves.
  hypertag keeps the two apart: `hypertag/meta` extracts, and fetching is a separate, thin, opt-in
  layer (`hypertag/fetch`, ~0.1 kB over meta) you add only if you want it — so you keep control of
  caching, SSRF and antibot. These rows are here for the ship-size picture, not field parity.

## Ship size — what you send to the edge

`esbuild --bundle --minify`, esm, gzipped, Node built-ins external:

| library | ship size (gz) | vs hypertag | deps | shape |
| --- | ---: | ---: | --- | --- |
| openlink | 4.0 kB | 0.75x | 0 | fetch + extract |
| **hypertag/meta** | **5.3 kB** | **1x** | **0** | extract (fetch opt-in) |
| linkpeek | 26.9 kB | 5.1x | htmlparser2 | fetch + extract |
| open-graph-scraper-lite | 630.8 kB | 119x | cheerio, chardet, validator | extract only |

hypertag/meta ships a **21-field** card (a superset of openlink's extractable field set) in 5.3 kB,
0 deps. Two honest reads:
- Against the **true extraction peer** (`open-graph-scraper-lite`), hypertag is **119x smaller** –
  it is cheerio underneath, so "lite" still ships a full parser tree.
- `openlink` is a hair **smaller** than hypertag/meta *and* fetches. So the honest superlative is
  scoped: hypertag is the smallest way to **extract** metadata from HTML you already have – not
  the smallest link-preview tool overall. Against openlink the difference is architecture
  (hypertag is extract-only, you keep control of the network step) and extraction breadth, not
  bytes.

## Extraction parity vs `open-graph-scraper-lite`

Same task, 6 saved real pages, fields `{title, description, image, url}`:

| | coverage (max 24) | agreement |
| --- | ---: | ---: |
| hypertag/meta | 23 / 24 | — |
| open-graph-scraper-lite | 23 / 24 | 23 / 24 identical |

Identical coverage, and 23/24 identical values. The single difference is `hypertag/meta`
returning a **cleaner** image URL – it strips the `utm_*` tracking parameters that
`open-graph-scraper-lite` leaves on Wikipedia's `og:image`. So the 119x size win costs nothing
in fields found or values produced.

## Speed and memory vs openlink (`npm run perf`)

`openlink`'s public `preview(url)` fetches, so this times its internal `parse` + `extract`
(the same extraction work minus the network, which if anything flatters openlink), over the
same 6 saved pages. Container numbers are relative, not absolute – the ratio is the point.

| | speed | retained memory (GC forced) |
| --- | ---: | ---: |
| **hypertag/meta** | **~2.5x** | ~0 MB |
| openlink (parse+extract) | 1x | ~0 MB |

hypertag is ~2x faster **despite doing more per call** (JSON-LD, full entity decode, URL
cleaning, favicon ranking). The reason: `openlink` runs ~30 separate full-string regex scans
per page (one `html.match()` per field), each re-scanning the whole document; hypertag scans
once and reads the parsed attributes. Memory is a **wash** – both are treeless, so neither
retains a tree. (The dramatic memory story is only against DOM builders like jsdom/cheerio, in
the main benchmark.)

## Correctness (`npm run correctness`)

Does the extractor return the **right value** on messy-but-valid markup? 12 cases with a
known-correct answer, scoring what each library actually returns (no decoding or resolution
applied on its behalf):

| | score /12 |
| --- | ---: |
| **hypertag/meta** | **12** |
| open-graph-scraper-lite (cheerio) | 7 |
| openlink | 6 |

hypertag is the only one that gets every case. It wins the ones the others miss: numeric and
accented HTML entities, `og:` written as `name=` (MDN style), stripping `utm_*` tracking params,
resolving a relative `og:url` (openlink returns the raw `/path`), and falling back to JSON-LD when
there is no OpenGraph. openlink decodes only ~10 basic entities and never resolves the `url` field;
`open-graph-scraper-lite` resolves no URLs and reads no JSON-LD.

## Not measured here

- **linkpeek / openlink field parity.** They fetch their own HTML, so they aren't run on the
  saved fixtures; comparing them fairly means letting them fetch live pages.
