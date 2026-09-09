# Build: portable tier-1 harness + per-runtime runners (Node / Bun / Deno)

Type: task
Status: claimed
Blocked by:

## Question

Build the tier-1 (import + parse, no network) harness per the contract in ticket 01: one shared,
runtime-agnostic module that imports the eight package subpaths + the barrel from the **installed
packed tarball** (ticket 03), asserts the export-shape contract (barrel named-only, colliding helpers
off it) and runs parse / stripComments / metadata / favicon plus a **stubbed** `fromUrl`, using a
plain throwing assert (**never `node:assert`**, so it runs on Workers too – ticket 04). Add thin
per-runtime runners for Node, Bun and Deno.

No secrets; buildable now. Module resolution per tickets 04–07 (all confirm the subpath `exports`
map). Feeds the CI runtime matrix (ticket 15).

Done = the shared module + three runners run green locally against the packed tarball.
