// Runner for the Vercel wrapper's deploy-free local validation (ticket 14). Same idea as
// run-handler.mjs, but the artifact under test is the Vercel `/api` function, which lives
// in a subdir (api/edge-e2e.js), so it assembles the consumer directly instead of via
// packRun's flat file copy. It:
//   1. packs the publishable tarball into a throwaway consumer (shared packConsumer),
//   2. lays the shared handler + tier2.mjs (EXPECTED) + assert.mjs + check.mjs at the
//      consumer root and the api function under api/ - mirroring the repo layout so the
//      api function's `import '../handler.mjs'` resolves,
//   3. `npm install`s the tarball there (so the bare `hypertag` specifier resolves to the
//      INSTALLED package, not the repo source),
//   4. runs check.mjs under the requested runtime (node | bun) against that install.
//
// The fixture is served from a localhost node:http server inside check.mjs; its absolute
// path is passed through the env. Proves the Vercel wrapper module loads + delegates
// without any deploy (the real deploy leg lives in deploy-check.mjs).
//
// Usage: node test/edge/vercel/run-vercel.mjs [node|bun]

import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdirSync, rmSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {packConsumer} from '../pack-run.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const edgeDir = join(here, '..')
const runtime = String(process.argv[2] || 'node').toLowerCase()

const RUNNERS = {
  node: entry => ['node', [entry]],
  // `bun run` (not `bun test`, which is the bun:test runner).
  bun: entry => ['bun', ['run', entry]]
}
if (!RUNNERS[runtime]) {
  console.error(`unknown runtime "${runtime}" (expected: ${Object.keys(RUNNERS).join(', ')})`)
  process.exit(2)
}

let consumer
try {
  // 1. Pack the tarball into a throwaway consumer (shared step from pack-run.mjs).
  ;({consumer} = packConsumer({label: 'vercel'}))

  // 2. Lay the shared handler + harness at the root and the api function under api/,
  //    mirroring the repo layout so api/edge-e2e.js's `import '../handler.mjs'` resolves.
  copyFileSync(join(edgeDir, 'handler.mjs'), join(consumer, 'handler.mjs'))
  copyFileSync(join(edgeDir, 'tier2.mjs'), join(consumer, 'tier2.mjs'))
  copyFileSync(join(edgeDir, 'assert.mjs'), join(consumer, 'assert.mjs'))
  copyFileSync(join(here, 'check.mjs'), join(consumer, 'check.mjs'))
  const apiDir = join(consumer, 'api')
  mkdirSync(apiDir)
  copyFileSync(join(here, 'api', 'edge-e2e.js'), join(apiDir, 'edge-e2e.js'))

  // 3. Install the packed tarball so `hypertag/fetch` resolves to the real install.
  console.log('vercel-local: npm install (packed tarball)')
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', '--silent'], {
    cwd: consumer,
    stdio: 'inherit',
    env: process.env
  })

  // 4. Run the wrapper check under the target runtime against the installed package.
  process.env.EDGE_E2E_HANDLER_FIXTURE = join(edgeDir, 'fixture', 'index.html')
  const [cmd, args] = RUNNERS[runtime]('check.mjs')
  console.log(`vercel-local[${runtime}]: ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, {cwd: consumer, stdio: 'inherit', env: process.env})

  console.log(`vercel-local[${runtime}]: OK (packed tarball, real install)`)
} catch (err) {
  console.error(`vercel-local[${runtime}]: FAIL ${err?.message ?? err}`)
  process.exitCode = 1
} finally {
  if (consumer) rmSync(consumer, {recursive: true, force: true})
}
