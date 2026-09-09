// Shared "pack + install + run" driver for the edge e2e tiers (ticket 03: test the
// PACKED TARBALL, not the repo source). Factored out of ticket 11's run-tier1.mjs so
// tier-1 and tier-2 share one driver instead of duplicating it. Both run-tier1.mjs
// and run-tier2.mjs are thin wrappers around `packRun()`.
//
// It proves the subpath `exports` map resolves from a REAL install. It:
//   1. runs `npm pack` to produce the publishable tarball,
//   2. creates a throwaway consumer dir under the OS temp dir with a minimal
//      `{"type":"module"}` package.json that depends on the tarball,
//   3. copies the harness files (assert.mjs + the tier module) into the consumer,
//   4. installs the tarball there (so the bare `hypertag` specifier resolves to the
//      INSTALLED package, not the repo source), and
//   5. runs the tier entry under the requested runtime (Node, Bun or Deno),
//   6. cleaning up the consumer + tarball afterwards.
//
// The orchestrator always runs on Node; only the tier entry runs under the target
// runtime. The current process env is passed through to the child, so per-run knobs
// like EDGE_E2E_FIXTURE_URL (tier-2) reach the harness.

import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')

// Per-runtime install argv + a `run(entry, permissions)` builder. Only Deno needs
// explicit permission flags; `permissions` lets a tier ask for more (tier-2 adds
// --allow-net for real fetch). Node and Bun ignore it.
const RUNNERS = {
  node: {
    install: ['npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', '--silent']],
    run: (entry, _permissions) => ['node', [entry]]
  },
  bun: {
    install: ['bun', ['install', '--no-save']],
    // `bun run` (not `bun test`, which is the bun:test runner).
    run: (entry, _permissions) => ['bun', ['run', entry]]
  },
  deno: {
    // Deno resolves the bare specifier from a node_modules dir it materializes.
    install: ['deno', ['install', '--allow-scripts', '--node-modules-dir=auto']],
    run: (entry, permissions) => [
      'deno',
      ['run', ...permissions, '--node-modules-dir=auto', entry]
    ]
  }
}

const exec = (cmd, args, cwd) =>
  execFileSync(cmd, args, {cwd, stdio: 'inherit', env: process.env, shell: false})

/**
 * Pack the library, install it into a throwaway consumer, copy the harness files in,
 * and run one tier entry under the target runtime. Sets process.exitCode on failure.
 *
 * @param {object} opts
 * @param {string} opts.label           log label, e.g. 'tier1' / 'tier2'.
 * @param {string} opts.runtime         'node' | 'bun' | 'deno'.
 * @param {string} opts.entry           entry file to run (basename in test/edge/).
 * @param {string[]} [opts.copy]        extra harness files to copy (basenames in test/edge/);
 *                                       'assert.mjs' and `entry` are always copied.
 * @param {string[]} [opts.denoPermissions] Deno permission flags for the run step.
 */
export function packRun({
  label,
  runtime,
  entry,
  copy = [],
  denoPermissions = ['--allow-read', '--allow-env']
}) {
  const target = String(runtime || 'node').toLowerCase()
  if (!RUNNERS[target]) {
    console.error(`unknown runtime "${target}" (expected: ${Object.keys(RUNNERS).join(', ')})`)
    process.exit(2)
  }

  let consumer
  try {
    consumer = mkdtempSync(join(tmpdir(), `hypertag-${label}-`))

    // 1. Pack the publishable tarball straight into the consumer dir.
    console.log(`${label}[${target}]: npm pack`)
    // `--ignore-scripts`: the repo's `prepare` lifecycle only installs husky git
    // hooks (no build step), which need not and should not run during packing.
    execFileSync('npm', ['pack', '--pack-destination', consumer, '--ignore-scripts', '--silent'], {
      cwd: repoRoot,
      stdio: ['ignore', 'inherit', 'inherit']
    })
    const tarball = readdirSync(consumer).find(f => f.endsWith('.tgz'))
    if (!tarball) throw new Error('npm pack produced no .tgz')

    // 2. Minimal ESM consumer that depends on the packed tarball.
    writeFileSync(
      join(consumer, 'package.json'),
      `${JSON.stringify(
        {
          name: `hypertag-${label}-consumer`,
          version: '0.0.0',
          private: true,
          type: 'module',
          dependencies: {hypertag: `file:./${tarball}`}
        },
        null,
        2
      )}\n`
    )

    // 3. The harness files run *inside* the consumer so `hypertag` resolves to the install.
    for (const file of new Set(['assert.mjs', entry, ...copy])) {
      copyFileSync(join(here, file), join(consumer, file))
    }

    // 4. Install the tarball with the target runtime's installer.
    const {install, run: runFor} = RUNNERS[target]
    console.log(`${label}[${target}]: ${install[0]} ${install[1].join(' ')}`)
    exec(install[0], install[1], consumer)

    // 5. Run the tier entry under the target runtime against the installed package.
    const runArgv = runFor(entry, denoPermissions)
    console.log(`${label}[${target}]: ${runArgv[0]} ${runArgv[1].join(' ')}`)
    exec(runArgv[0], runArgv[1], consumer)

    console.log(`${label}[${target}]: OK (packed tarball, real install)`)
  } catch (err) {
    console.error(`${label}[${target}]: FAIL ${err?.message ?? err}`)
    process.exitCode = 1
  } finally {
    // 6. Clean up the consumer dir (the tarball lives inside it).
    if (consumer) rmSync(consumer, {recursive: true, force: true})
  }
}
