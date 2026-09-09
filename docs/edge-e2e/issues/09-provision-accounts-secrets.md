# Provision provider accounts + CI credentials (Cloudflare, Deno Deploy, Vercel)

Type: task
Status: claimed
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

Research (04/05/06) and the deployment model (08) are settled, so the exact secrets are known. Each
provider's steps below were re-verified against current provider docs (Sep 2026) – see
**Verification notes** at the end. Bun and Node need nothing. Create each account, then add the repo
secrets below (Settings → Secrets and variables → Actions → New repository secret). The agent cannot
create third-party accounts or mint tokens – this is yours to do; then tell me the secret **names**
exist (not the values).

### Cloudflare Workers (ephemeral `workers.dev` deploy)

A **free plan is enough**; ephemeral deploy → curl → delete sits well inside the free limits
(100k req/day, 50 external subrequests/req). No domain/zone needed – deploys target the built-in
`*.workers.dev` subdomain.

- [ ] Confirm a Cloudflare account (free plan).
- [ ] Create the API token → secret **`CLOUDFLARE_API_TOKEN`**. Two routes:
  - *Simplest:* **My Profile → API Tokens** (dash.cloudflare.com/profile/api-tokens) → **Create
    Token** → use the **"Edit Cloudflare Workers"** template → under **Account Resources** scope it
    to your one account → name it (e.g. `hypertag-edge-e2e-ci`) → optional TTL / client-IP filter →
    **Continue to summary → Create Token** → **copy the value now** (shown only once).
  - *Tightest:* same start but **Create Custom Token → Get started**, add exactly one permission
    **Account · Workers Scripts · Edit** (covers deploy, `versions upload`, and `delete`), scope to
    the one account, create, copy.
- [ ] Record the account id → secret **`CLOUDFLARE_ACCOUNT_ID`**. Find it via **Account home →**
      Cmd/Ctrl + K → type `Copy account ID`; or **Workers & Pages →** *Account Details* panel → copy
      button next to **Account ID**.

### Deno Deploy (persistent app – Deno Deploy EA at console.deno.com, *not* Classic/`deployctl`)

Deploy Classic shut down 20 Jul 2026; `deployctl` is retired in favour of the built-in `deno deploy`
subcommand. Free tier covers CI; there is no free per-run auto-teardown, so the app is persistent
(ticket 08).

- [ ] Create an account **and an organization** at console.deno.com, then one app. The app URL is
      `<app-name>.deno.dev`.
- [ ] New Access Token at **console.deno.com/account/access-tokens → New Access Token** → copy
      immediately (shown once). → secret **`DENO_DEPLOY_TOKEN`**
- [ ] Tell me **three** values the CI wiring needs (ticket 10): the **org name** (it's in the console
      URL, `console.deno.com/<ORG-NAME>`), the **app name**, and the **region** (`us`, `eu`, or
      `global`).

### Vercel Edge (ephemeral preview; Hobby is fine)

- [ ] Create an account and **pre-create the project** (so `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` skip
      linking in CI; a project's *first* deploy is always production, later ones are previews).
- [ ] Token at **Account Settings → Tokens** (optionally `--project`-scoped). → secret
      **`VERCEL_TOKEN`**
- [ ] Record org + project ids from **`.vercel/project.json`** (created by one `vercel link`). →
      secrets **`VERCEL_ORG_ID`**, **`VERCEL_PROJECT_ID`**
- [ ] Let CI reach the protected preview URL – **pick one**:
  - *Preferred (no long-lived secret):* **Settings → Deployment Protection → Trusted Sources** →
    authorise GitHub Actions via short-lived OIDC, scoped to this repo/branch. Nothing to store as a
    secret. Vercel now recommends this for new setups.
  - *Simpler fallback:* **Settings → Deployment Protection → Protection Bypass for Automation** →
    generate a secret (passed to the curl as the `x-vercel-protection-bypass` header). → secret
    **`VERCEL_AUTOMATION_BYPASS_SECRET`**

### GitHub Pages (tier-2 fixture host, per ticket 02)

- [ ] Enable GitHub Pages for the repo so the committed fixture HTML is served at a stable URL.

### What to report back (resolves this ticket)

Tell me – **names only, never values**:

1. Which secrets now exist: **`CLOUDFLARE_API_TOKEN`**, **`CLOUDFLARE_ACCOUNT_ID`**,
   **`DENO_DEPLOY_TOKEN`**, **`VERCEL_TOKEN`**, **`VERCEL_ORG_ID`**, **`VERCEL_PROJECT_ID`**, and
   **either** `VERCEL_AUTOMATION_BYPASS_SECRET` **or** "Trusted Sources configured".
2. The Deno **org name + app name + region**.
3. The **GitHub Pages URL** the fixture is served from.

Then this ticket's **Answer** records those (names + non-secret facts) and it's marked resolved.

## Verification notes (Sep 2026)

Re-checked against current provider docs; the deploy-mechanics are unchanged from the research, with
these deltas now reflected above:

- **Cloudflare:** account-id lookup and token flow confirmed (docs updated Aug 2026). Minimal custom
  token = *Account · Workers Scripts · Edit*.
- **Deno:** token env var **`DENO_DEPLOY_TOKEN`** and URL **console.deno.com/account/access-tokens**
  confirmed; **added the org name** to the report-back list (CI's `deno deploy --org <org> --app
  <app>` needs it; the earlier checklist asked only for app + region).
- **Vercel:** `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` and the bypass-secret flow
  confirmed; **added Trusted Sources (OIDC)** as the now-recommended alternative that removes one
  long-lived secret. The deploy command itself (`--prebuilt` pattern, disabling the native Git
  integration) is a CI-wiring detail – noted on tickets 06 and 10, not a provisioning step.

Sources: Cloudflare [Create API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/),
[Find account and zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/);
Deno [`deno deploy` reference](https://docs.deno.com/runtime/reference/cli/deploy/),
[deploy tutorial](https://docs.deno.com/examples/deploy_command_tutorial/),
[denoland/skills AUTHENTICATION.md](https://github.com/denoland/skills/blob/main/skills/deno-deploy/references/AUTHENTICATION.md);
Vercel [GitHub Actions with Vercel](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel),
[Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
