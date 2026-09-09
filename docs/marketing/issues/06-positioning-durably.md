# Record the VoC positioning durably

Type: grilling
Status: open

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
