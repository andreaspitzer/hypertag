# Marketing surface (wayfinder:map)

## Destination

A ready-to-ship, **on-package marketing surface** for hypertag, built on the **voice-of-customer
evidence** and the **npm/SEO research**. It leads with the pains developers voice about the
incumbents (edge/serverless incompatibility, dependency/bundle bloat, memory), problem-first,
anchored to the link-preview / page-metadata job, and tuned for npm search. Deliverables: a
from-scratch README, a `package.json` description + ordered keywords, current in-repo docs, and the
GitHub repo's topics + social preview. Name locked `hypertag`. The map plans and drafts; a human
runs `npm publish` and pushes.

## Notes

- **Two foundational inputs, both in `docs/marketing/research/` – every ticket grounds in them:**
  - [`voc.md`](research/voc.md) – voice-of-customer pain evidence + priorities.
  - [`npm-search-ranking.md`](research/npm-search-ranking.md) – how npm search actually ranks (2026).
- **The rulebook: [`principles.md`](principles.md).** The standing rules for writing the README and
  docs (positioning, voice, competitor treatment, structure, claims/honesty, terminology, formatting),
  harvested from the two inputs above and this effort's decisions. Every README/docs ticket builds
  from it, and it is the single home for these rules – the map only indexes it. It carries an **Open
  decisions** section (O1–O3), tracked as ticket 05.
- **Positioning spine, derived from the VoC evidence** (not from an abstract "which identity"
  grilling – that earlier framing was discarded with the prior map):
  - **Problem-first.** Open on the buyer's situation and the wall they hit.
  - **Pains in VoC's order:** (1) edge/serverless incompatibility, (2) dependency/bundle bloat,
    (3) memory (a close third). Anchor to the **link-preview / page-metadata** job.
  - The metadata **extractor is the point**; the tag **parser is the supporting floor** (the reason
    it stays small). Extractor-forward, parser honest-but-secondary.
  - **Neutral confidence, not contrast.** Lead on hypertag's own strengths (VoC lede A: edge-fit,
    zero-dep, small, low-memory), not on rivals' failures. Reference the alternatives (jsdom,
    cheerio, metascraper, Cloudflare HTMLRewriter) only as neutral benchmark data and respectful
    "when to use something else" pointers – no put-downs, no loaded quotes.
- **SEO rules (from `npm-search-ranking.md`):** npm search is neutral text-match (name >>
  keywords/description/readme); the name `hypertag` carries nothing for the extractor terms, so the
  description + keywords + readme body are the levers. Put target phrases verbatim in **both
  spellings** (`link preview`/`link-preview`, `open graph`/`opengraph`); target long-tail phrases;
  ship a substantive readme + description before publish.
- **Reconciliations the VoC drafts need** (they predate these): the `fetch` (`fromUrl`) and `oembed`
  layers now ship; and the VoC size numbers are stale – use the measured figures (core 1.0 / meta
  5.3 / fetch 5.5 kB; jsdom ~74 MB retained; parser speed ratios on Node 22 in `benchmark/`).
- **Constraints:** name locked `hypertag`; plan-don't-do (no `npm publish`, no `git push`); metric
  units, endash not emdash. The committed `README.md` is a stale, parser-first draft – it is
  **replaced from scratch**, not edited.

## Decisions so far

<!-- index of closed tickets: one line each, gist + link; detail lives in the ticket -->

- [Write the README from VoC + SEO](issues/01-readme-from-voc.md) — README.md written from scratch to the VoC spine: problem-first hero (VoC lede A), the link-preview endpoint as the lead example, the jsdom/cheerio/HTMLRewriter contrast with fresh measured numbers, the tag parser as the floor, and the metascraper slice. Keyword-woven for npm/SEO; `fromUrl`/`oembed` reconciled in. Uncommitted; rendered preview published.
- [Settle competitor treatment + benchmark completeness](issues/05-competitor-treatment-benchmark.md) — O1: "vs metascraper" prose cut (names only in neutral data), HTMLRewriter kept as the one documented exception; O2: hero size claim is "edge-ready" + factual ~5 kB, no size superlative; O3: an edge link-preview benchmark table (openlink/linkpeek/ogs-lite) added above the parser table. Rules folded into principles.md (X1/C2). Landed together with the ADR-0002 packaging change, so README numbers are the fresh ESM-only figures.
- [package.json description + ordered keywords](issues/02-npm-description-keywords.md) — new `description` echoes the finalized hero (drops the old "smallest" superlative, per C2); keyword list trimmed 17→11 (filler dropped, both-spelling coverage kept via canonical hyphenated forms that token-split, plus `Open Graph` spaced in description/README prose). Paired README coverage pass added the missing spaced/long-tail terms (`Open Graph`, `meta tags`, `og tags`) as natural prose without adding length – ranking rewards term coverage, not word count (BM25 length-normalization; readme already past the thin-content gate). The edge benchmark table also gained an `extract speed` column (hypertag 1x, openlink 2.8x slower, ogs-lite ~80x), reproduced via `npm run bench:edge`.

## Not yet specified

<!-- in-scope fog; graduates into tickets as the frontier advances -->

- **Docs surface for the VoC framing.** Once the README lands (ticket 01), decide whether
  `docs/api.md` / `CONTEXT.md` need aligning to the extractor-forward story, and audit `docs/api.md`
  against the seven shipped layers. Graduates after 01.
- **Recording the positioning durably.** Whether the VoC-derived positioning should be written as an
  ADR or `CONTEXT.md` note so it doesn't drift. Small; revisit once the surface is drafted.

## Out of scope

<!-- ruled beyond the destination; never graduates -->

- **Running `npm publish` and pushing to git** – plan-don't-do (destination). A human triggers these.
- **Outbound launch / announcement channels** (HN, r/javascript, dev.to) – on-package surface only.
- **A dedicated docs site or landing page** beyond in-repo markdown.
- **A fuller VoC pass on open egress** (HN/Reddit/SO were blocked; current corpus is github-only).
  Would sharpen the pain-ranking, but the direction is settled enough to ship on; note it, don't
  block on it.
