# hypertag documentation principles

> **Purpose.** The standing rules for writing hypertag's README and docs, so they can be built – and
> rebuilt from scratch – from principle rather than re-litigated line by line. Derived from the
> marketing effort's research ([`voc.md`](research/voc.md),
> [`npm-search-ranking.md`](research/npm-search-ranking.md)) and the decisions made while writing the
> README.
>
> **Precedence.** When a rule and a draft disagree, the rule wins. When the code and a rule disagree,
> fix the rule (the code is ground truth). Rules marked **(open)** are not settled yet – see the
> Open decisions section; do not treat them as binding until resolved.

## Why this positioning – the decision behind the rules

> **This section is the durable record of the positioning *decision*; the numbered rules below are how
> it is applied.** It exists so a future contributor rewriting the surface has the reasoning, not only
> the rules, and does not re-open a settled question or let the framing drift. (Recorded per the
> marketing map's ticket 06; the alternatives considered were a `docs/adr/` entry, a marketing-scoped
> decision record, and a `CONTEXT.md` note – all set aside because positioning is a marketing decision,
> not an architecture one, and belongs beside the rules it justifies, in this file. `docs/adr/` stays
> architecture-only.)

**The decision.** hypertag's on-package marketing surface is positioned **problem-first around the
edge link-preview / page-metadata job**: it opens on the buyer's situation and leads with the pains
developers voice about the incumbents, in this order – (1) edge / serverless incompatibility, (2)
dependency / bundle bloat, (3) memory (a close third). The **metadata extractor is the point** and the
tag parser is the supporting **floor** (the reason it stays small). The tone is **neutral confidence**:
sell hypertag's own strengths, reference the alternatives only as neutral benchmark data, never build
the pitch on a rival's failure.

**Why – it is derived from evidence, not chosen by taste.** This replaced an earlier abstract
"which identity should hypertag have" framing (discarded with the prior map). Two research inputs
ground it, and every numbered rule below traces back to them:

- [`research/voc.md`](research/voc.md) – the three axes hypertag genuinely leads on (edge-fit,
  zero-dependency / small, low retained memory) are *exactly* the three pains developers voice about
  jsdom, cheerio, and metascraper (evidence E1–E5), and "create a link-preview API endpoint" = "pull
  og / meta" is a real, verbatim job (E3). The evidence did not redirect the direction; it **settled
  the ordering** – edge + zero-dep + size loudest, memory close behind, anchored to the meta / OpenGraph
  job. That ordering is VoC's recommended "lede A".
- [`research/npm-search-ranking.md`](research/npm-search-ranking.md) – npm search is neutral text-match
  and the name `hypertag` carries nothing for the extractor terms someone searches, so discoverability
  rides entirely on the description, keywords, and readme body. The surface must therefore be
  problem- and keyword-led, not name-led.

**Known limit (does not reopen the decision).** The VoC corpus is single-platform (github-only; HN /
Reddit / SO egress was blocked). A fuller pass would sharpen the pain-ranking but is out of scope for
this effort – the direction is settled enough to ship on. See the map's Out-of-scope section.

## 1. Positioning – what we sell, and to whom

- **P1. Problem-first.** Open on the reader's situation and requirement, not on a feature list. The
  canonical situation: *building a link-preview / unfurl endpoint that has to run on an edge runtime.*
- **P2. Lead on the buyer's pains, in this order** (from `voc.md`): (1) edge / serverless
  incompatibility, (2) dependency / bundle bloat, (3) memory (a close third). Anchor everything to the
  **link-preview / page-metadata** job.
- **P3. The extractor is the point; the parser is the floor.** Lead with `metadata` / `fromUrl` (the
  card). The `parse()` tag parser is the foundation that keeps the extractor small – present it as a
  supporting layer you can drop to, never as the headline.
- **P4. URL-in is the headline; HTML-in is the variant.** Show `fromUrl(url)` first; `metadata(html,
  url)` is the "already have the HTML" path. Never frame hypertag as "reads HTML you already have"
  first – that is stale (pre-`fetch`-layer) framing.
- **P5. The name carries nothing.** `hypertag` is locked and says nothing to someone searching
  "opengraph" or "link preview"; discoverability rides entirely on the description, keywords, and the
  readme body (see `npm-search-ranking.md`).
- **P6. The hero speaks the buyer's terms.** Foreground the standards buyers actually voice –
  **OpenGraph** and **`<meta>`** (VoC evidence E3: "pull og/meta"; lede A). Capabilities buyers don't
  name (JSON-LD, Twitter cards) are real and belong in the body, not the hero one-liner.

## 2. Voice & tone

- **V1. Neutral confidence, not contrast.** Sell hypertag's own strengths and the buyer's
  requirements. Never build the pitch around a rival's failure. (This is VoC "lede A", not the
  competitor-naming "lede C".)
- **V2. No put-downs, no loaded quotes.** Do not quote a competitor's bug tracker, call a tool bloated,
  or say a rival "won't run / leaks / drags". State the requirement hypertag meets; let the reader
  draw the comparison.
- **V3. Vary the verbs.** Do not lean on one construction ("reach for", "drop to") repeatedly. A phrase
  that appears three times in a page is a phrase to rewrite.
- **V4. Confident, not boastful.** Superlatives must be earned and scoped (see C-rules). Prefer a
  concrete number to an adjective.

## 3. How we treat competitors

- **X1. Product names appear only in neutral benchmark data** – a table of reproducible numbers. They
  do **not** appear in prose put-downs or prose recommendations. One documented exception: the
  **HTMLRewriter** "read vs rewrite" comparison stays as named prose, because HTMLRewriter is a
  runtime API (not a benchmarkable library) and the distinction is genuinely useful to the edge reader.
- **X2. In prose, name the *category*, not the brand.** "a DOM library", "a streaming HTML rewriter",
  "a headless browser", "a full metadata scraper" – not the specific product.
- **X3. "When not to reach for hypertag" is generous and brand-free.** It sends the reader to the right
  *kind* of tool for jobs hypertag doesn't do (JS rendering, DOM traversal / repair, inline rewriting,
  a broader ruleset).
- **X4. Benchmark the real competitors for the positioned job.** For a link-preview tool, that means
  the edge link-preview libraries, not only general HTML parsers. **(open – see Open decisions)**

## 4. Structure & headings

- **S1. JTBD-style headings.** Section headings are verb-led jobs the reader wants done: "Build a
  link-preview endpoint", "Parse the raw tags yourself". Not noun/feature labels ("The tag parser").
- **S2. Canonical section order:** hero (problem → claim) → Install → the lead JTBD (the endpoint) →
  the proof (small / fast / low-memory, with the benchmark) → the secondary JTBD (parse raw tags) →
  when not to reach for hypertag → API. Keep the two content sections parallel in heading style.
- **S3. One idea per section; link out for depth** (API reference, `CONTEXT.md`, `benchmark/`).

## 5. Claims, numbers & honesty

- **C1. Every number is reproducible from `benchmark/`.** Never carry a figure from a prior draft;
  re-derive from the benchmark code / committed results.
- **C2. No size superlative the benchmark can falsify.** A fetch+extract lib (openlink, 4.0 kB) is
  smaller than hypertag/meta (5.3 kB), so state size as a plain fact ("about 5 kB"), never "smallest".
  Keep the earned superlatives **"fastest"** and **"lowest-memory"**: the benchmark backs both, and
  lowest-memory holds because hypertag ties the other treeless tools at ~0 retained (nobody is lower).
  The third hero slot is **"edge-ready"** – a property, not a superlative. Where a competitor beats us
  on an axis, lead on the axis we win (correctness, retained memory, extract-only control), never the
  one we don't.
- **C3. Accuracy beats punch.** When a punchy claim overstates the code, soften it ("one pass per tag
  type", not "one string scan"). The core `parse()` genuinely does one scan; the full card does not.
- **C4. Same claim, same number, same framing everywhere.** A figure or argument that appears more than
  once must agree with itself across the page (e.g. one metascraper footprint story, not two).
- **C5. Measure before you name.** Never put a competitor in a benchmark without real, reproduced
  numbers for it.

## 6. Terminology

- **T1. "card" = a plain data object,** never a rendered UI element. Anchor it ("the card, as a plain
  object") or say "object" when there is no nearby anchor. Prefer "link-preview card" (the JTBD term)
  where it is already anchored.
- **T2. Preferred nouns:** *link-preview card* (the cooked object), *the extractor* (`metadata` /
  `fromUrl`), *the tag parser* / *the floor* (`parse`), *sources* (OpenGraph / Twitter / JSON-LD, the
  inputs) vs *fields* (title / description / …, the outputs) – never conflate sources and fields.

## 7. Formatting

- **F1. Endash (–), never emdash (—).**
- **F2. Metric units.**
- **F3. Sizes in kB gzipped; keep the benchmark methodology note (task, one sample run, ratios are the
  point, reproducible command).**

## Process (how an agent builds the README from these rules)

1. Read the two research inputs and this file first.
2. Re-derive all numbers from `benchmark/` (C1); verify code examples against the actual module
   exports.
3. Draft to the structure (section 4); apply the voice and competitor rules (2, 3).
4. Self-audit: consistency (C4), scoped superlatives (C2), zero emdashes (F1), sources-vs-fields (T2),
   no brand names in prose (X1/X2).
5. Render a preview for human review before it is considered done.

## Open decisions (settle these, then fold into the rules above)

- **O1. Resolved.** The "vs metascraper" prose was cut per X1/X2 (its substance → benchmark data in
  O3; a de-named category mention, "a full metadata scraper", kept in "when not to reach"). The "vs
  HTMLRewriter" prose is **kept** as X1's one documented exception (a runtime API, not a benchmarkable
  library; the read-vs-rewrite distinction is genuinely useful). X1/X2 now fully applied.
- **O2. Resolved.** The hero makes no size superlative: the third slot is **"edge-ready"** (a
  property) and size is the plain fact "about 5 kB"; "fastest" and "lowest-memory" stay. Folded into
  rule C2.
- **O3. Resolved.** A second "edge link-preview lib" table (openlink, linkpeek,
  open-graph-scraper-lite) sits above the parser table in the README; metascraper excluded (not edge).
  All three are neutral benchmark data (rule X1); openlink's smaller 4.0 kB is stated honestly (C2).
  All open decisions (O1–O3) are now closed.
