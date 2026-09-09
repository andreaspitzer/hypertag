# Verifying the README's performance claims in CI

The README makes size, correctness, and performance claims (see the "Small, fast, and
low-memory" section). This effort turns the ones that can be measured **reliably** into CI
gates, and **tracks** the rest. The split is by measurement determinism, not importance.

## What is gated vs tracked

| Claim | Where it's measured | In CI |
| --- | --- | --- |
| Per-layer gzipped ship size (`/parse` 0.7 kB … `/meta` 5.0 kB, barrel 6.6 kB) | `test/claims/size-gate.mjs` + `test/claims/budgets.mjs` | ✅ **Gated** (required) |
| Extractor correctness, 12/12 messy cases | `test/claims/correctness-gate.mjs` | ✅ **Gated** (required) |
| Extraction speed vs competitors ("2.8x", "127x slower") | `benchmark/` (`speed.mjs`) | 📊 Tracked (informational) |
| Peak / retained memory ("~0 MB retained", the MB table) | `benchmark/` (`memory.mjs`) | 📊 Tracked (informational) |

**Why the split.** Size and correctness are deterministic — same bytes, same pass/fail every
run, no network or timing — so they gate the branch. Speed and memory are measured on shared
GitHub runners where absolute numbers vary run-to-run (`benchmark/memory.mjs` says as much:
"the noisiest of the three benchmarks … an order-of-magnitude comparison, not a precise
measurement"). Gating those on tight thresholds would flake, so they are printed to the run
summary of an allowed-to-fail job instead of gating.

## Running locally

```bash
npm run claims               # both gates (size + correctness)
npm run claims:size          # per-layer gzip size vs budgets
npm run claims:correctness   # 12/12 messy-case extractor check
CLAIMS_MEASURE=1 npm run claims:size   # print current gzip bytes without asserting

cd benchmark && npm run bench           # the tracked speed + size + memory tables
```

## The size budgets

`test/claims/budgets.mjs` holds a gzipped-byte ceiling per entry point, measured with the same
method as `benchmark/layer-sizes.mjs` (esbuild `--bundle --minify` + gzip; esbuild is pinned to
an exact version so the bytes move only when hypertag's source moves). Each budget is the
**rounding ceiling** of the README's kB figure — the largest byte count that still displays as
that number — so a layer may grow within its claim, but the moment it would ship more than the
README says, the gate fails.

When an intended change moves a layer's size: re-seed with `CLAIMS_MEASURE=1 npm run
claims:size`, set the budget to the new rounding ceiling, and update the README's size table in
the **same commit**. The gate's failure message says this too.

## CI wiring

`.github/workflows/claims.yml`:

- **`claims (size + correctness)`** — required, runs on every push and PR. Needs only `npm ci`
  (the gates use the source files and `esbuild`; no competitor libraries).
- **`track speed + memory (informational)`** — `continue-on-error`, on push to `develop` and
  `workflow_dispatch`. Installs `benchmark/`'s competitor libraries and prints the speed/memory
  tables to the run summary.

**Maintainer action:** mark `claims (size + correctness)` as a required status check; do not
require the informational job.

## Out of scope (for now)

The **competitor comparison** numbers ("2.8x faster than openlink", "4.0 kB for openlink") are
tracked, not gated — they depend on the competitors' current versions and on runner timing.
Reconciling the README's prose ("the fastest", "lowest-memory") to what the tracked runs show
over time is a documentation follow-up, not a gate.
