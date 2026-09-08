# hypertag – context

Tiny zero-dependency HTML tag and attribute parser. This document is the standing
description of the project's shape and vocabulary. It is a living doc: update the layer
table below as layers are actually added. Decisions and their rationale live in
`docs/adr/`; this file records what *is*, not why it was chosen.

## Architecture

hypertag is a **stacked set of optional utility layers** over a small, fast core. Three
rules govern how it grows (see ADR-0001 for the reasoning and the alternatives rejected):

1. **Keep each layer clean and honest** – a layer's API promises exactly what it does and
   hides no domain assumption.
2. **Keep the core simple and fast** – layer 0 knows only tags and attributes, stays
   zero-dependency and edge-sized.
3. **Gradually stack optional layers** – each capability goes in the lowest layer that can
   host it honestly, is opted into by importing, and depends only on the layers beneath.

Dependencies point **down only**: nothing lower ever imports something higher.

| layer | package | knows about | responsibility | status |
| --- | --- | --- | --- | --- |
| 0 · core | `hypertag` | tags + attributes | scan HTML → flat `Tag[]`. Zero-dep, edge-sized. | shipped |
| 1 · select | `hypertag/select` | tags + selectors | narrow and read tags (selectors, presets; `pick` planned). | shipped |
| 1 · sanitize | `hypertag/sanitize` | values | decode / clean / resolve values. | shipped |
| 2 · ld | `hypertag/ld` | JSON | unwrap JSON-LD shapes. First non-HTML code. | planned |
| 3 · rules | separate, metalink-shaped | the domain | field→source priority, `og` beats `twitter`. | planned |

**Where new code goes.** A general mechanism over tags/selectors → `select`. A value-to-
cleaner-value transform, field-agnostic → `sanitize`. Anything operating on parsed JSON
rather than HTML → `ld` (never core). Anything encoding which source means which field,
or a preference between sources → the `rules` layer (never lower).

## Glossary

Use these terms – in issues, ADRs, refactor proposals, test names – rather than synonyms.

- **Core** – the layer 0 package (`hypertag`): `parse`, `parseAttrs`, `stripComments`,
  `extend`. Returns a flat `Tag[]`. No cooked values, no domain knowledge.
- **Tag** – one matched opening tag as a plain object: its attributes, plus the tag name
  under `$tag`, plus (with the `content` option) element content under `$content`.
- **Layer** – an opt-in package that adds capability over the layers beneath it, imported
  separately so its cost is only paid when used.
- **Honest layer** – one whose API promises exactly what it does and leaks no assumption
  from a higher layer downward (e.g. `select` never bakes in metadata priorities).
- **Mechanism vs. rules** – a *mechanism* is domain-agnostic (`pick` does preference-
  ordered first-match; the caller supplies the order). A *rule* encodes domain knowledge
  (og beats twitter; this selector means "title"). Mechanisms live low; rules live high.
- **`pick`** – planned layer 1 mechanism: first present value across an ordered list of
  `[selector, attr]` rules, in the caller's preference order. No metadata knowledge.
- **Cooked value** – a normalized, domain-resolved output (a page's "title"). Producing
  cooked values is the job of the top rules layer, not the core.
