# package.json description + ordered keywords

Type: grilling
Status: resolved
Blocked by: 01

## Question

Decide the final `package.json` **`description`** and **`keywords`**, grounded in the VoC pains and
the npm search mechanics ([`npm-search-ranking.md`](../research/npm-search-ranking.md)).

- The description is the human pitch **and** an indexed search field; the keyword list is the
  primary discoverability lever, since the name `hypertag` carries nothing for the extractor terms.
- Anchor the description to the same VoC lede as the README hero (they must be mutually consistent).
- Put the high-value phrases verbatim, in **both spellings** (`link preview`/`link-preview`,
  `open graph`/`opengraph`, `html parser`/`html-parser`); favour long-tail phrases (`og tag
  extractor`, `link preview metadata`, `zero-dependency html parser`) over the giant head terms.
- Roughly 5–12 genuinely relevant keywords; order is cosmetic (for humans, not the algorithm).

Output: the exact `description` string and `keywords` array, ready to drop into `package.json`.
Blocked by 01 so it echoes the finalized hero.

## Answer

Both shipped into `package.json`.

**Description** (echoes the finalized hero – `fastest, edge-ready`, `no DOM`, `zero dependencies`,
`lowest-memory`, `~5 kB`; drops the old **"smallest"** superlative, which openlink at 4.0 kB
falsifies, per C2/O2):

> The fastest, edge-ready way to pull link preview tags from HTML into one card: Open Graph,
> Twitter cards, JSON-LD, meta tags and favicon – ~5 kB, no DOM, zero dependencies, lowest-memory.
> Runs on Node, Deno, Bun and Cloudflare Workers.

The description carries the **spaced** spellings (`link preview`, `Open Graph`, `meta tags`) as
plain text, since npm shows the description un-rendered and it is an indexed field.

**Keywords** (11 – trimmed from 17; dropped filler `og`, `og-image`, `metadata`, `meta`, `html`,
`parser`, `deno`, `bun`, which either duplicate tokens already present or add nothing a real user
types, per the anti-spam/dilution note in `npm-search-ranking.md`):

```json
["opengraph", "open-graph", "link-preview", "unfurl", "og-tags",
 "meta-tags", "html-metadata", "html-parser", "cloudflare-workers", "edge", "favicon"]
```

Rationale on both-spellings: hyphenated keywords split into their tokens under the search
analyzer (`link-preview` → `link` + `preview`, `html-parser` → `html` + `parser`), so the spaced
searches are already covered token-wise; the hyphenated forms are kept because they are the
canonical npm keyword-browse pages. The one term that does **not** auto-split is `opengraph`
(single token), so both `opengraph` and `open-graph` are kept, and the spaced literal `Open Graph`
lives in the description + README prose.

**README coverage pass** (paired with this ticket): added the spaced/long-tail terms that were
missing – `Open Graph`, `meta tags`, `og tags` – as natural body prose, leaving the user-tuned
hero and JTBD headings untouched. `link preview` (spaced) was left as the hyphenated `link-preview`
throughout since that token-splits to the same `link` + `preview`. Verbosity was **not** increased:
the finding (recorded with the user) is that npm ranking rewards term *coverage*, not word count –
BM25 length-normalization dilutes a padded field, and the readme is already well past the
thin-content gate.
