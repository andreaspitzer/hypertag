# Record the VoC positioning durably

Type: grilling
Status: resolved

## Question

The VoC-derived positioning (problem-first, edge/serverless → bundle → memory pain order, extractor
forward / parser as the floor, neutral-confidence competitor treatment) now drives the README,
`package.json`, and `docs/api.md`. It lives as writing rules in
[`principles.md`](../principles.md), but there is no record of the positioning **decision** itself
in the repo's durable decision log – so a future contributor rewriting the surface has the rules but
not the "why this identity" reasoning, and it can drift.

Decide whether to record it durably, and where:

- An **ADR** under `docs/adr/` (e.g. "0003 – VoC-derived positioning") capturing the decision and
  its evidence base (the two research inputs), so it sits alongside ADR-0001/0002 as a first-class
  decision – vs. a shorter **`CONTEXT.md` note**, vs. leaving `principles.md` as the sole home.
- If an ADR: does it belong in `docs/adr/` (domain/architecture decisions) at all, given positioning
  is a marketing decision, not an architecture one? Consider whether `docs/marketing/` (where
  `principles.md` already lives) is the more honest home and `principles.md` just needs a short
  "Why this positioning" preamble linking the research, rather than a new file.

Output: the decision (ADR / CONTEXT note / principles.md preamble / leave as-is) and, if it lands as
a written artifact, that artifact drafted.

## Context

Graduated from the map's "Not yet specified" on resolving ticket 03 (the docs surface is now
drafted, which was this question's precondition). Unblocked.

## Answer

**Decision: a "Why this positioning" preamble in `docs/marketing/principles.md`** (human's call in the
grilling). The positioning decision + its rationale + evidence base now live as a new section, "Why
this positioning – the decision behind the rules", at the top of `principles.md`, directly above the
numbered rules it justifies. It links the two research inputs (`research/voc.md`,
`research/npm-search-ranking.md`), states the decision (problem-first, edge link-preview job, pain
order edge → bundle → memory, extractor-forward / parser-as-floor, neutral confidence), records *why*
it is evidence-derived rather than an abstract identity choice, and notes the single-platform VoC
corpus as a known limit that does not reopen the decision.

**Alternatives considered and set aside:**

- **A new ADR under `docs/adr/` (e.g. 0003).** Rejected: `docs/adr/` is scoped to domain/architecture
  decisions (`docs/agents/issue-tracker.md`, `domain.md`). Positioning is a marketing decision, so
  filing it there would blur that boundary. `docs/adr/` stays architecture-only.
- **A marketing-scoped decision record** (an ADR-style file/sub-tree under `docs/marketing/`).
  Rejected: adds a new sub-tree to maintain for a single decision; the rationale is better co-located
  with the rules it explains than split into a parallel record.
- **A `CONTEXT.md` note.** Rejected: `CONTEXT.md` records the project's standing *shape* ("what is"),
  not decisions, and positioning is not architecture.
- **Leave `principles.md` as the sole home with no "why".** Rejected: that is the status quo the ticket
  exists to fix – the rules were present but the decision and its reasoning were not, so the framing
  could drift.

Artifact: the preamble is drafted and in place in `docs/marketing/principles.md`.
