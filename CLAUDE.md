# hypertag

Tiny zero-dependency HTML tag and attribute parser.

## Architecture

Layered, optional utility stack: a small fast core with opt-in layers above it, dependencies pointing down only. See `CONTEXT.md` and `docs/adr/0001-stacked-optional-layers.md`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `docs/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
