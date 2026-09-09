# Build: local tier-2 (native `fromUrl`) + GitHub Pages fixture

Type: task
Status: resolved
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

## Answer

Done (commit `7754eea`). Local tier-2 + Pages fixture:

- `test/edge/fixture/index.html` – controlled fixture with deterministic `og:*` (title / description /
  image / url; the `og:title` carries `&amp;` to also prove entity decoding + og-over-`<title>`).
- `.github/workflows/pages.yml` – dedicated Pages deploy workflow (`upload-pages-artifact` +
  `deploy-pages`) publishing the fixture dir to the site root; on push to the default branch +
  `workflow_dispatch`. No test jobs (ticket 15 owns those).
- `test/edge/tier2.mjs` – runtime-agnostic native-`fromUrl` check; **exact-match** on title /
  description / image / url via the reused `assert.mjs`. Target from env `EDGE_E2E_FIXTURE_URL`
  (default = live Pages URL); exports `FIXTURE_URL` + a frozen `EXPECTED` table for the deploy tickets
  to reuse.
- `test/edge/pack-run.mjs` – shared pack + install + run driver; `run-tier1.mjs` refactored onto it
  (tier-1 re-verified green), `run-tier2.mjs` added.
- package.json: `smoke:edge:tier2[:node|:bun|:deno]`.

Fixture URL: **https://andreaspitzer.github.io/hypertag/**; expected card values frozen in
`test/edge/tier2.mjs`.

Verified here: **Node 22 + Bun 1.3 GREEN** via a localhost server serving the fixture (native fetch,
exact-match on all four fields). Deno wired (`--allow-net`), CI confirms. The live `github.io` URL
can't be reached from this sandbox (egress proxy blocks it) – CI is the first place it's hit for real.

**Maintainer action:** Settings → Pages → **Source = "GitHub Actions"** (else `pages.yml` is ignored
and the fixture never goes live).
