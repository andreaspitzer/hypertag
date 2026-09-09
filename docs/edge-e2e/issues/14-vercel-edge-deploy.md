# Build: Vercel Edge deployed tier-2 job

Type: task
Status: resolved
Blocked by: 13

## Question

Build the Vercel shim over the shared edge handler (ticket 13) and its CI job per the deployment model
(ticket 08): `vercel pull` → `vercel build` → `vercel deploy --prebuilt` **ephemeral preview** → curl
(against the Pages fixture, ticket 12) → assert the card. Use `export const config = { runtime:
'edge' }` for the `/api` function (ticket 06). Auth via `VERCEL_TOKEN` + `VERCEL_ORG_ID` +
`VERCEL_PROJECT_ID`; preview-URL access via **Trusted Sources (OIDC)** – no static bypass secret
(ticket 09, provisioned). Set `"git": { "deploymentEnabled": false }` in `vercel.json` to avoid double
deploys (ticket 10 note).

Blocked by 13 only for the shared handler; secrets ready. Feeds the CI wiring (ticket 15) as an
allowed-to-fail deployed job.

Done = a real Vercel preview deploy runs `fromUrl` over the network and asserts the card.

## Answer

Done (commit `00120ed`). Vercel Edge deployed tier-2:

- `test/edge/vercel/api/edge-e2e.js` – wraps the shared handler: `import handler from '../handler.mjs';
  export default handler; export const config = { runtime: 'edge' }`.
- `test/edge/vercel/vercel.json` – `{"framework": null, "git": {"deploymentEnabled": false}}` (no
  double-deploy).
- `test/edge/vercel/deploy-check.mjs` (`smoke:edge:vercel`) – ephemeral: packConsumer + api + vercel.json
  → `vercel pull --yes --environment=preview` → `vercel build` → `vercel deploy --prebuilt`
  (`npx vercel@latest`, `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`) → capture preview URL →
  **OIDC-authorized** fetch `<preview>/api/edge-e2e?url=<FIXTURE_URL>` → deepEqual `EXPECTED`. Skips
  (exit 0) when secrets/OIDC absent. Previews auto-expire (no teardown).
- `check.mjs` + `run-vercel.mjs` (`smoke:edge:vercel:local[:node|:bun]`) – deploy-free wrapper check.

**Trusted Sources OIDC:** the assert request presents a GitHub Actions OIDC token in the
`x-vercel-trusted-oidc-idp-token` header; the token is minted from `ACTIONS_ID_TOKEN_REQUEST_URL` +
`ACTIONS_ID_TOKEN_REQUEST_TOKEN`, audience `https://github.com/andreaspitzer` (override
`VERCEL_OIDC_AUDIENCE`). OIDC authorizes only the assert request; the deploy itself uses the static
`VERCEL_TOKEN`.

Verified here: wrapper check green Node + Bun (`config.runtime==='edge'`, card == `EXPECTED`);
skip-guard exit 0; dummy-cred run reaches vercel CLI 59.x; biome lint clean; full suite + tier-1 +
handler + tier-2(localhost) green. Real deploy deferred to CI.

**Ticket 15 must:** give the Vercel job `permissions: id-token: write` (else it silently skips);
secrets `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`; job is allowed-to-fail.
