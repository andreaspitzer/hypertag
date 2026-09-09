// Tier-1 "pack + install + run" driver (ticket 03: test the PACKED TARBALL).
//
// This is the crucial part that proves the subpath `exports` map resolves from a
// real install. It:
//   1. runs `npm pack` to produce the publishable tarball,
//   2. creates a throwaway consumer dir under the OS temp dir with a minimal
//      `{"type":"module"}` package.json that depends on the tarball,
//   3. copies tier1.mjs + assert.mjs into the consumer,
//   4. installs the tarball there (so the bare `hypertag` specifier resolves to
//      the INSTALLED package, not the repo source), and
//   5. runs tier1.mjs under the requested runtime (Node, Bun or Deno),
//   6. cleaning up the consumer + tarball afterwards.
//
// The orchestrator always runs on Node; only the tier1.mjs execution runs under
// the target runtime. Usage:
//   node test/edge/run-tier1.mjs [node|bun|deno]

import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const RUNNERS = {
  // [install argv, run argv] – argv[0] is the binary, run from the consumer dir.
  node: {
    install: ['npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', '--silent']],
    run: ['node', ['tier1.mjs']]
  },
  bun: {
    install: ['bun', ['install', '--no-save']],
    // `bun run` (not `bun test`, which is the bun:test runner).
    run: ['bun', ['run', 'tier1.mjs']]
  },
  deno: {
    // Deno resolves the bare specifier from a node_modules dir it materializes.
    install: ['deno', ['install', '--allow-scripts', '--node-modules-dir=auto']],
    run: ['deno', ['run', '--allow-read', '--allow-env', '--node-modules-dir=auto', 'tier1.mjs']]
  }
}

const runtime = (process.argv[2] || 'node').toLowerCase()
if (!RUNNERS[runtime]) {
  console.error(`unknown runtime "${runtime}" (expected: ${Object.keys(RUNNERS).join(', ')})`)
  process.exit(2)
}

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {cwd, stdio: 'inherit', env: process.env, shell: false})

let consumer
try {
  consumer = mkdtempSync(join(tmpdir(), 'hypertag-tier1-'))

  // 1. Pack the publishable tarball straight into the consumer dir.
  console.log(`tier1[${runtime}]: npm pack`)
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
        name: 'hypertag-tier1-consumer',
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
  copyFileSync(join(here, 'assert.mjs'), join(consumer, 'assert.mjs'))
  copyFileSync(join(here, 'tier1.mjs'), join(consumer, 'tier1.mjs'))

  // 4. Install the tarball with the target runtime's installer.
  const {install, run: runArgv} = RUNNERS[runtime]
  console.log(`tier1[${runtime}]: ${install[0]} ${install[1].join(' ')}`)
  run(install[0], install[1], consumer)

  // 5. Run tier1.mjs under the target runtime against the installed package.
  console.log(`tier1[${runtime}]: ${runArgv[0]} ${runArgv[1].join(' ')}`)
  run(runArgv[0], runArgv[1], consumer)

  console.log(`tier1[${runtime}]: OK (packed tarball, real install)`)
} catch (err) {
  console.error(`tier1[${runtime}]: FAIL ${err?.message ?? err}`)
  process.exitCode = 1
} finally {
  // 6. Clean up the consumer dir (the tarball lives inside it).
  if (consumer) rmSync(consumer, {recursive: true, force: true})
}
