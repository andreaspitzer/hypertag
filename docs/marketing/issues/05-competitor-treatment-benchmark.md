# Settle competitor treatment + benchmark completeness

Type: grilling
Status: resolved

## Question

Resolve the three open decisions recorded in [`principles.md`](../principles.md) (O1–O3), then fold
the results back into `principles.md` (move them from "Open decisions" into the binding rules) and
apply them to `README.md`:

- **O1 – competitor names in "vs" prose. RESOLVED:** the "vs metascraper" prose is cut (per X1/X2);
  its substance moves to the benchmark data (O3), with a de-named mention kept in "when not to reach".
  The "vs HTMLRewriter" prose is **kept** as X1's one documented exception (runtime API, not a
  benchmarkable lib; read-vs-rewrite is genuinely useful). Folded into `principles.md` X1.
- **O2 – the "smallest" claim. RESOLVED:** the hero makes no size superlative – the third slot is
  **"edge-ready"** (a property) and size is stated as the plain fact "about 5 kB" (not "smallest",
  which openlink at 4.0 kB would falsify); "fastest" and "lowest-memory" stay. Folded into
  `principles.md` rule C2. (O3 still open.)
- **O3 – benchmark competitor set + structure. RESOLVED:** a second **"edge link-preview lib"** table
  (openlink, linkpeek, open-graph-scraper-lite) now sits above the parser table in the README's
  "Small, fast, and low-memory" section – ship size, deps, edge, correctness /12 (measured, RESULTS.md).
  metascraper is **not** in it (it's not edge-capable; its de-named "full metadata scraper" mention in
  "when not to reach" stands). All three rows are neutral benchmark data (rule X1); the honest openlink
  caveat (4.0 kB, smaller) is stated (rule C2).

Output: the three decisions made, `principles.md` updated so they are binding, and `README.md` (+ the
benchmark table) brought into line. This refines the already-resolved README (ticket 01); no need to
reopen it.

## Answer

All three resolved (details in the O1/O2/O3 bullets above; the binding rules live in
[`principles.md`](../principles.md) X1/C2):

- **O1:** the "vs metascraper" prose was cut (names only in neutral benchmark data); the "vs
  HTMLRewriter" prose is kept as X1's one documented exception (a runtime API, not a benchmarkable lib).
- **O2:** the hero makes no size superlative – "edge-ready" (a property) + the plain fact "~5 kB".
- **O3:** an **edge link-preview lib** benchmark table (openlink, linkpeek, open-graph-scraper-lite)
  now sits above the parser table in the README, with measured ship size / deps / edge / correctness;
  metascraper stays out (not edge). openlink's smaller 4.0 kB is stated honestly.

The packaging change (ADR-0002) landed alongside this, so the README's numbers are the fresh ESM-only
figures and `npm run bench` / `bench:edge` reproduce them.

**Follow-up compliance pass (X1/X2/V2).** The edge-table narrative initially re-stated the table's
open-graph-scraper-lite numbers as named prose ("cheerio underneath … 630 kB … Node-compat flag") –
a brand put-down that X1/X2/V2 forbid and that duplicated the table. It was trimmed: the prose now
names only **openlink** (the honesty caveat C2 requires) and lists linkpeek/openlink neutrally as the
two that fetch their own HTML; ogs-lite/cheerio characterization lives only in the neutral table. The
linkpeek `–` methodology note moved into the table caption. An `extract speed` column was also added
to the edge table (hypertag 1x, openlink 2.8x slower, ogs-lite ~80x), reproduced by `npm run bench:edge`.
