# Tier-2 fetch-path contract: target, assertions, and what "real" means

Type: grilling
Status: resolved

## Question

Settle the **tier-2** contract – the full `fromUrl` path over a **real** network, which nothing
currently tests (the smoke stubs `fetch`). This is the effort's centre of gravity: the `fetch`
layer is the one runtime-divergent surface (`CONTEXT.md`).

Decide:

1. **What target does `fromUrl` hit?** Options, roughly cheapest-to-most-controlled:
   - A **known stable public page** (e.g. a page with settled OpenGraph tags). Simple, but external
     and can drift or rate-limit, making CI flaky.
   - A **fixture page we control** – a tiny static HTML page with a fixed set of og/twitter/JSON-LD
     tags, served from somewhere reachable by every runtime (GitHub Pages? an R2/static bucket? the
     deployed worker serving its own fixture?). Stable and asserts exact values.
   - The deployed endpoint **serving its own fixture and fetching itself** (self-request), so no
     third-party dependency at all.
   This is the key call – it decides flakiness, and whether outbound egress to arbitrary hosts (vs
   same-origin) is even exercised.
2. **What card fields do we assert?** Exact-match on `title`/`description`/`image`/`url` from the
   fixture (proves decoding, URL-resolution, source fallback all fire), or a looser "non-null card
   came back"? Tie the assertion to whatever fixture ticket-1's decision picks.
3. **Does tier 2 run on non-edge runtimes too** (Node, Bun as a local `fromUrl` against the real
   network), or only on the deployed edge endpoints? A local Node/Bun tier-2 is cheap and catches
   native-`fetch` divergence without any deploy.
4. **Failure semantics.** `fromUrl` is documented to never throw on a broken page (returns nulls).
   So tier 2 must assert *positive* extraction against a *known-good* target, not merely "didn't
   throw". Confirm.

Output: a written tier-2 contract (target strategy, fixture definition if any, assertion list,
which runtimes get a network-real run) that the deployment-model decision (08) and the graduated
endpoint tickets build against.

## Answer

The tier-2 contract – the one runtime-divergent surface (native `fetch` via `fromUrl`):

1. **Target: a controlled static fixture page we own, published on GitHub Pages.** One canonical
   URL with a fixed set of OpenGraph / Twitter / JSON-LD tags, hit by every runtime's `fromUrl`.
   Rationale: it exercises **genuine cross-origin outbound egress** – the thing edge runtimes
   actually restrict – with zero third-party flakiness and exact, known values. Rejected: a public
   page (drifts / rate-limits → flaky), and the endpoint fetching **itself** (same-origin only, so
   it would not prove real outbound egress). The fixture HTML is committed in-repo; enabling Pages
   is folded into provisioning (ticket 09).
2. **Assert: exact-match on `title` / `description` / `image` / `url`** against the fixture's known
   values – this proves entity decoding, relative-URL resolution, and source fallback all fire, not
   merely that a card came back.
3. **Non-edge runtimes get a network-real run too:** a local Node / Bun / Deno tier-2 that calls
   `fromUrl(fixtureUrl)` against the same Pages URL. Cheap, needs no deploy, and catches native-`fetch`
   divergence (including Node's own).
4. **Failure semantics confirmed:** `fromUrl` never throws on a broken page (returns nulls), so tier
   2 asserts **positive extraction against the known-good fixture**, never "didn't throw".
