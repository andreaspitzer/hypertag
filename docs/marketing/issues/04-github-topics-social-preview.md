# GitHub repo topics + social preview

Type: prototype
Status: resolved
Blocked by: 02

## Question

Decide the GitHub repo's discoverability surface (repo-side settings + one image asset, no outbound
campaign):

- The **repo description** (shown in GitHub search / topic listings) and the **topic tags**, reusing
  the keyword decision from ticket 02, adapted to GitHub's topic conventions and the VoC framing.
- The **social-preview card** (the `og:image` shown when the repo link is shared) – produce 1–2
  concepts to react to that carry the pain-first, edge-ready message.

Output: the exact repo description + topic list, and the chosen social-card concept (drafted asset
or a precise spec a human can render). Blocked by 02 (topics reuse the keyword set).

## Answer

Plan-only (a human applies the three repo-side settings in GitHub's UI; no push). Everything below
reuses ticket 02's keyword decision and the finalized README hero, adapted to GitHub conventions.

**Current live surface (before), both stale/parser-first:**

- Description: `🏎 The fastest HTML tag and attributes parser for JavaScript`
- Topics: `html-parser`, `javascript`, `nodejs`, `tag-parsing`

### 1. Repo description (About box)

A tightened sibling of the `package.json` description – same claims/framing (C4), just shorter for
the About box. Drops the parser-first framing; leads on the link-preview job and the edge; keeps the
earned `fastest` + `edge-ready` (property) and the plain `~5 kB` fact, no size superlative (C2):

> 🔗 The fastest, edge-ready way to pull link-preview tags from HTML into one card – Open Graph, meta
> and JSON-LD. No DOM, zero dependencies, ~5 kB. Runs on Node, Deno, Bun and Cloudflare Workers.

Emoji: **🔗** recommended (matches the link-preview JTBD, P1); the incumbent 🏎 over-indexes on
speed alone. Shorter fallback if the About box truncation looks tight:

> 🔗 Pull link-preview tags from HTML into one card – Open Graph, meta, JSON-LD. Edge-ready, no DOM,
> zero dependencies, ~5 kB.

### 2. Topic tags

GitHub topics are exact browse facets (github.com/topics/<t>), not a token-split BM25 field, so the
adaptation from the npm keyword set is: keep the same spine, keep both `opengraph` and `open-graph`
(each is a distinct browse page), and add the two card sources npm dropped as prose-only (P6) since
as topics they are real discovery facets – `twitter-cards`, `json-ld`. Drop the three current
generic/parser-first topics (`javascript`, `nodejs` are too broad to discover on; `tag-parsing` is
the old floor-first framing). **13 recommended:**

```
link-preview  unfurl  opengraph  open-graph  og-tags  twitter-cards  json-ld
meta-tags  html-metadata  html-parser  cloudflare-workers  edge  favicon
```

Ordering (extractor-forward → the floor → runtime → a distinctive field) is cosmetic; GitHub, like
npm, matches on presence, not position.

**Hold in reserve** (add only if broader browse reach is wanted, accepting mild dilution; each is
honest but lower-signal for the positioned job): `metadata`, `zero-dependencies`, `og-image`,
`web-scraping`, `deno`, `bun`. Left out of the default set to keep it tight and on-job (same
anti-stuffing instinct as ticket 02).

### 3. Social-preview card (og:image, 1280×640)

Two concepts drafted as editable SVG + rendered PNG under `docs/marketing/assets/`. Both obey the
rulebook: neutral confidence, no competitor names or put-downs (V1/V2/X1), endash not emdash (F1),
metric/kB (F2/F3), only earned claims + `edge-ready` as a property (C2). A human exports the chosen
SVG to a 1280×640 PNG and uploads it under Settings → Social preview.

- **Concept A – "The card"** (recommended): problem-first, extractor-forward. Eyebrow "LINK-PREVIEW
  ENDPOINTS, ON THE EDGE", headline "Turn a URL into a link-preview card", and the actual output
  card object rendered as the hero visual (image → title → description → favicon+domain), with the
  `fromUrl(url) → { … }` signature and the proof chips (`no DOM`, `zero dependencies`, `~5 kB`,
  `lowest-memory`) + runtime row. Shows the job and the output (P1/P3), not just claims.
  [`social-card-A-the-card.svg`](../assets/social-card-A-the-card.svg) ·
  [PNG](../assets/social-card-A-the-card.png)
- **Concept B – "The proof"** (fallback): claim-first, centered `</hypertag>` wordmark hero, the
  hero one-liner, and the earned claims as large chips (`fastest`, `edge-ready`, `lowest-memory`,
  `~5 kB`, `0 dependencies`). Cleaner/"spec-sheet" feel; less differentiated than A.
  [`social-card-B-the-proof.svg`](../assets/social-card-B-the-proof.svg) ·
  [PNG](../assets/social-card-B-the-proof.png)

**Recommendation: Concept A** – it leads with the buyer's job and literally shows the card, which is
the whole positioning (P1 problem-first, P3 extractor-is-the-point). Concept B is the safe minimalist
option if a wordmark-hero look is preferred. The human picks one (the HITL half of this prototype
ticket); no ticket blocks on the choice.

**Chosen: Concept A "The card"** (human decision). The human exports
[`social-card-A-the-card.svg`](../assets/social-card-A-the-card.svg) to a 1280×640 PNG and uploads it
under Settings → Social preview. Concept B is kept in the repo as an unused alternate.

### Adjacent, optional (not in scope, flagged for the human)

The repo `homepage` field is empty. Pointing it at the npm page
(`https://www.npmjs.com/package/hypertag`) is a one-field, zero-cost discoverability lever a human
can flip at the same time – noted, not required, and not a docs-site/landing-page (which stays out
of scope).
