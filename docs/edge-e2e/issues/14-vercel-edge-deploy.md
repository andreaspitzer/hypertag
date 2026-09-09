# Build: Vercel Edge deployed tier-2 job

Type: task
Status: claimed
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
