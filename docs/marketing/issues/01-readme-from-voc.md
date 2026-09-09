# Write the README from the VoC evidence + SEO

Type: prototype
Status: resolved

## Question

Write `README.md` from scratch, driven **only** by the two research inputs
([`voc.md`](../research/voc.md), [`npm-search-ranking.md`](../research/npm-search-ranking.md)) and
the shipped code – not by any prior draft. The committed `README.md` is a stale parser-first draft;
replace it wholesale.

Shape it to the VoC spine (see the map's Notes):

- **Problem-first hero.** Open on the buyer's situation (building a link-preview / unfurl endpoint)
  and the wall they hit, then the pain-ordered claim (VoC lede A: *"the fastest, smallest,
  lowest-memory way to pull OpenGraph, meta and JSON-LD out of HTML – no DOM, zero dependencies,
  built for the edge"*), keyword-woven per the SEO rules (both spellings of the target phrases).
- **Lead example = the link-preview endpoint** (the JTBD), on the edge, in one file.
- **The "why it runs where jsdom / cheerio / HTMLRewriter don't" contrast**, grounded in the voiced
  pains (E1–E5), with the fresh benchmark table and the retained-memory headline.
- **The tag parser as the floor** – honest, secondary, the reason the extractor stays small.
- **metascraper slice** and a **when-not-to-reach-for-hypertag** that names HTMLRewriter (read vs
  rewrite), cheerio/jsdom (traversal/repair), metascraper (JS render / fuller ruleset).

Reconcile: the `fetch` (`fromUrl`) and `oembed` layers now ship – use them where they serve the
endpoint JTBD; use the **measured** numbers (`benchmark/`), not VoC's stale figures. Honor endash
(not emdash) and metric units.

**Resolve HITL:** first put the hero + section outline in front of the user to react to, *then*
write the full draft and render it. Do not write the whole file unilaterally. Output: the rewritten
`README.md` (uncommitted) + a rendered preview.

## Answer

`README.md` written from scratch, driven only by [`voc.md`](../research/voc.md) +
[`npm-search-ranking.md`](../research/npm-search-ranking.md) and the shipped code – no prior draft
carried over. The user approved the hero + outline before the full write.

### Shipped structure

Problem-first hero (VoC lede A, keyword-woven) → Install → **Build a link-preview endpoint**
(`fromUrl` as the lead example, `metadata(html, url)` for HTML you already have, `oembed` for
un-scrapeable social URLs) → **Why it runs where jsdom and cheerio don't** (fresh 5-row benchmark +
retained-memory headline + the **HTMLRewriter** contrast) → **The tag parser (the floor)** (`parse`,
`select`, the per-import size table) → **`metadata()` vs metascraper** → When not to reach → API.

### VoC spine honored

Opens on the buyer's wall (jsdom won't bundle on Workers, cheerio 490 kB + memory leaks,
metascraper's 180 MB canvas – E1–E5); pains in VoC's order (edge > bloat > memory); the extractor is
the point and the parser is the floor; names all four real alternatives (jsdom, cheerio, metascraper,
HTMLRewriter).

### SEO + reconciliations

Keyword-woven per `npm-search-ranking.md` (link preview, OpenGraph, meta tags, JSON-LD, HTML
metadata, Cloudflare Workers, favicon, edge, zero dependencies); exact both-spelling keyword coverage
is deferred to the description/keywords ticket (02). `fromUrl` + `oembed` used where they serve the
endpoint JTBD (VoC drafts predated them); **measured** numbers throughout (Node 22 benchmark), not
VoC's stale sizes.

### Checks

Zero emdashes (verified), metric units, every code example matches the verified `.mjs` exports.
Rendered preview published (artifact URL). `README.md` left uncommitted for review.

### Follow-ons

- The `package.json` description (ticket 02) must echo this hero.
- Docs audit + alignment (ticket 03), now unblocked.
