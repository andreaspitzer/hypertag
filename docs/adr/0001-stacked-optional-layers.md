# 0001 – Stacked optional utility layers

- Status: Accepted
- Date: 2026-09-08

## Context

hypertag is a tiny zero-dependency HTML tag and attribute parser. Its whole reason to
exist is doing less than a DOM: one string scan returning a flat `Tag[]`, small enough
to ship to an edge runtime, fast enough that the scan is a rounding error.

As it gets used, demand keeps arising for conveniences that sit *above* raw tags:
CSS-like selectors, value normalization (entity decoding, whitespace, URL cleanup),
priority-ordered metadata fallback (`og:title` else `twitter:title`), JSON-LD unwrapping.
Each is individually reasonable. The danger is accretion: if these land in the core
package, hypertag slowly becomes a metadata scraper – it grows dependencies, loses its
edge size, and stops being an honest "primitive" that a pipeline reaches for when it
already has the HTML. That is the niche metascraper and metalink already own; competing
with them on their terms throws away the one thing hypertag has.

So the recurring question is not "is this feature good?" but "which layer does it belong
in, and does putting it there keep that layer honest?"

## Decision

Organize hypertag as **strictly layered, opt-in utility packages**, exposed as subpath
exports (`hypertag`, `hypertag/select`, `hypertag/sanitize`, …). Three rules govern:

1. **Keep each layer clean and honest.** A layer's API promises exactly what it does and
   hides no domain assumption. `pick` performs a preference-ordered first-match; it does
   not secretly know that `og:` outranks `twitter:` – the caller supplies the order. The
   moment a utility needs domain knowledge (which selector means "title", which source
   wins), it belongs in an upper rules layer, not a lower mechanism layer.
2. **Keep the core simple and fast.** Layer 0 (`hypertag`) knows only tags and attributes
   and stays zero-dependency and edge-sized. Nothing that isn't tag parsing gets in.
3. **Gradually stack optional layers.** Each new capability goes in the *lowest* layer
   that can host it honestly, imports only the layers beneath it, and is something a
   consumer opts into by importing. Dependencies point down only; nothing lower ever
   imports something higher.

### The layers

| layer | package | knows about | responsibility |
| --- | --- | --- | --- |
| 0 · core | `hypertag` | tags + attributes | scan HTML → flat `Tag[]`. Zero-dep, edge-sized. |
| 1 · select | `hypertag/select` | tags + selectors | narrow and read tags. Home of `pick`. |
| 1 · sanitize | `hypertag/sanitize` | values | decode / clean / resolve values. |
| 2 · ld (future) | `hypertag/ld` | JSON | unwrap JSON-LD shapes. First non-HTML code – its own layer, never core. |
| 3 · rules (future) | separate, metalink-shaped | the domain | field→source priority, `og` beats `twitter`. The cooked-value ruleset. |

### Placement heuristic (how to apply this to a new utility)

- General mechanism over tags/selectors, no domain knowledge → `hypertag/select`.
- Turns a value into a cleaner value, field-agnostic → `hypertag/sanitize`.
- Operates on parsed JSON rather than HTML → `hypertag/ld` (layer 2), not core.
- Encodes which source means which field, or a preference between sources → the rules
  layer (layer 3), never lower.

## Consequences

**Positive**

- The core stays ~0.8 kB and edge-deployable no matter how many utilities accrue; a
  consumer pays only for the layers it imports.
- Layer boundaries are testable and the positioning stays coherent: hypertag remains a
  primitive, and the cooked-value ruleset is explicitly a different (upper) layer or a
  separate package.
- "Where does this go?" has a mechanical answer, so features don't drift downward into
  the core by default.

**Costs**

- More subpath exports and type-definition pairs to maintain than a single module.
- Some composition a monolith would hide is pushed onto the consumer (you import
  `select` *and* `sanitize` and wire them together). This is intentional – it is the
  price of each layer staying honest.

## Alternatives considered

- **A metadata ruleset in core.** Rejected: it imports the identity (and, eventually, the
  dependency weight) of a scraper, breaking both the edge-size guarantee and the "hand
  back tags, not cooked values" contract.
- **A single grab-bag `helpers.js`.** Rejected: it mixes altitudes in one file – a
  tag find sitting next to JSON-LD unwrapping sitting next to URL resolution – which is
  precisely a dishonest layer (its name promises nothing, so it constrains nothing).
- **Do nothing; let every consumer reimplement the plumbing.** Rejected for genuinely
  general mechanisms (`pick`, null-tolerant `sanitize`) that every consumer rewrites the
  same way. Accepted, deliberately, for *domain rules* – consumers should own their own
  field-to-source priorities rather than inherit ours.
