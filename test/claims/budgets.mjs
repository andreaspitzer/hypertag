// Committed gzipped-size budgets (BYTES) per public entry point - the ceilings the size
// claim gate (./size-gate.mjs) enforces. Each budget is the ROUNDING CEILING of the figure
// the README's per-layer table quotes: the largest byte count that still displays as that
// kB value (round(bytes / 1024, 1) === claimed kB). So a layer may grow freely within its
// claim, but the moment it ships more than the README says (its figure would round up), the
// gate fails - forcing the README table and this file to be updated together, deliberately.
//
// Measured with esbuild --bundle --minify + gzip (see size-gate.mjs), which is why esbuild is
// pinned to an exact version in package.json: the bytes must move only when hypertag's source
// moves, never because a bundler patch shifted the output. Re-seed after an intended change
// with `CLAIMS_MEASURE=1 npm run claims:size`, then set each budget to its new rounding ceiling
// and update the README table in the same commit.
//
//   entry              README    ceiling (this budget)   measured at seed
//   hypertag           6.6 kB    6809 B                  6717 B
//   hypertag/parse     0.7 kB     767 B                   673 B
//   hypertag/ld        0.9 kB     972 B                   914 B
//   hypertag/sanitize  1.4 kB    1484 B                  1422 B
//   hypertag/oembed    1.4 kB    1484 B                  1436 B
//   hypertag/select    1.9 kB    1996 B                  1991 B  (near the 1.9/2.0 boundary)
//   hypertag/meta      5.0 kB    5171 B                  5073 B
//   hypertag/fetch     5.1 kB    5273 B                  5235 B
export const BUDGETS = {
  hypertag: 6809,
  'hypertag/parse': 767,
  'hypertag/ld': 972,
  'hypertag/sanitize': 1484,
  'hypertag/oembed': 1484,
  'hypertag/select': 1996,
  'hypertag/meta': 5171,
  'hypertag/fetch': 5273
}
