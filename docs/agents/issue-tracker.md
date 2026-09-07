# Issue tracker: Local Markdown

Issues and specs (you may know a spec as a PRD) for this repo live as markdown files under `docs/`.

## Conventions

- One feature per directory: `docs/<feature-slug>/`
- The spec is `docs/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `docs/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file, holding one of the triage role strings (see `triage-labels.md`)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

Keep feature slugs distinct from `docs/adr/` (domain decisions) and `docs/agents/` (this configuration) so the trees do not collide.

## Two kinds of ticket

Feature work and wayfinding efforts share the `docs/<slug>/issues/NN-<slug>.md` file shape but differ in two ways:

- **Feature issues** (below) sit under a `docs/<feature-slug>/spec.md` and carry a `Status:` line with a **triage role** from `triage-labels.md`.
- **Wayfinding tickets** (`## Wayfinding operations`) sit under a `docs/<effort>/map.md` and carry a `Type:` line plus a `Status:` line with a **wayfinding state** (`claimed` / `resolved`), not a triage role.

The `Status:` vocabulary is therefore determined by which root file the directory holds (`spec.md` vs `map.md`).

## When a skill says "publish to the issue tracker"

Create a new file under `docs/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `docs/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `docs/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records the wayfinding state `claimed`/`resolved` (not a triage role).
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `docs/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
