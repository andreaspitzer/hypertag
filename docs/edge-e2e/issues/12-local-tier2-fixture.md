# Build: local tier-2 (native `fromUrl`) + GitHub Pages fixture

Type: task
Status: claimed
Blocked by:

## Question

Per the tier-2 contract (ticket 02): commit the controlled fixture HTML served at
**https://andreaspitzer.github.io/hypertag/** (a known title / description / image / url), and build
the local tier-2 check that runs `fromUrl(<fixtureUrl>)` on Node / Bun / Deno with each runtime's
**native `fetch`**, asserting **exact-match** on the card fields (positive extraction, never "didn't
throw").

No secrets; buildable now. This is the layer that also gives Deno its real native-fetch signal while
the deployed Deno Deploy job (ticket 16) is blocked. Feeds the CI runtime matrix (ticket 15).

Done = fixture live on Pages + local tier-2 green on Node / Bun / Deno.
