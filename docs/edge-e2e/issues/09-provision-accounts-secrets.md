# Provision provider accounts + CI credentials (Cloudflare, Deno Deploy, Vercel)

Type: task
Status: open
Blocked by: 04, 05, 06

## Question

Manual work that unblocks every deploy-and-assert step: the maintainer must create/confirm the edge
accounts and put their credentials into GitHub Actions secrets. This is a **HITL task** – the agent
cannot (and should not) create third-party accounts or mint tokens on the maintainer's behalf. It is
**blocked by the three deploy research tickets (04, 05, 06)** so the checklist below is filled in
with the *exact* token scopes and ids each platform needs, rather than guesses.

When 04/05/06 have resolved, this ticket's body gets the concrete checklist. The shape it will take
(to be made precise from the research):

- **Cloudflare Workers:** confirm an account; create an API token scoped to `workers.dev` deploy
  (minimum scopes from ticket 04); record the account id. → repo secrets `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`.
- **Deno Deploy:** confirm an account + a project; create an access token (ticket 05). → secret(s)
  for `deployctl` (token, project name).
- **Vercel:** confirm an account (Hobby is fine if the research says so); create a token; record org
  + project ids (ticket 06); check the preview-deployment protection setting so CI can reach the
  URL. → repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Bun and Node need **nothing** here (local-only in CI).

The agent's role: once research lands, rewrite this into a copy-pasteable checklist (names of each
secret, where to click, minimum scopes) and hand it to the maintainer. The maintainer performs the
sign-ups and pastes the secrets. **Answer records** which secret names now exist (not their values)
and any account-specific facts (project names, chosen region) that the CI wiring (ticket 10) and the
endpoint tickets depend on.

## Handover checklist (ready for the maintainer)

Research (04/05/06) and the deployment model (08) are settled, so the exact secrets are known.
Bun and Node need nothing. Create each account, then add the repo secrets below
(Settings → Secrets and variables → Actions). The agent cannot create third-party accounts or mint
tokens – this is yours to do; then tell me the secret **names** exist (not the values).

**Cloudflare Workers** (ephemeral deploy)
- [ ] Confirm a Cloudflare account (free plan is enough).
- [ ] Create an API token with the **"Edit Cloudflare Workers"** template (Account → Workers
      Scripts : Edit; add Account Settings : Read only if a later step needs it). Scope it to the one
      account. → secret **`CLOUDFLARE_API_TOKEN`**
- [ ] Record the account id. → secret **`CLOUDFLARE_ACCOUNT_ID`**

**Deno Deploy** (persistent app – the new platform at console.deno.com, *not* Classic/`deployctl`)
- [ ] Create an account + org + one app/project at console.deno.com; note the app name and region
      (e.g. `us`).
- [ ] New Access Token at console.deno.com/account/access-tokens. → secret **`DENO_DEPLOY_TOKEN`**
- [ ] Tell me the app/project name + region (needed by the CI wiring, ticket 10).

**Vercel Edge** (ephemeral preview; Hobby is fine)
- [ ] Create an account and **pre-create the project** (so `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` skip
      linking in CI).
- [ ] Token at Account Settings → Tokens. → secret **`VERCEL_TOKEN`**
- [ ] Record org + project ids (from `.vercel/project.json` after one link). → secrets
      **`VERCEL_ORG_ID`**, **`VERCEL_PROJECT_ID`**
- [ ] Project Settings → Deployment Protection → generate a **Protection Bypass for Automation**
      secret (preview URLs are protected by default on Hobby). → secret
      **`VERCEL_AUTOMATION_BYPASS_SECRET`**

**GitHub Pages** (tier-2 fixture host, per ticket 02)
- [ ] Enable GitHub Pages for the repo so the committed fixture HTML is served at a stable URL.

When done, this ticket's **Answer** records which secret names now exist (not their values) plus the
Deno app name/region and the fixture's Pages URL, and then it can be marked resolved.
