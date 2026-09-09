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
