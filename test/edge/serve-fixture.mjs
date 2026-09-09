// Tiny zero-dependency static server for the committed tier-2 fixture
// (test/edge/fixture/), used by the CI runtime matrix (ticket 15) to bootstrap the
// LOCAL tier-2 check.
//
// Why this exists: the local tier-2 default target (test/edge/tier2.mjs FIXTURE_URL)
// is the LIVE GitHub Pages URL, which is only published once this branch reaches
// master (pages.yml). On a pull request that URL 404s, so the required matrix cannot
// depend on it. Instead CI starts THIS server for the committed fixture and points the
// tier-2 step at it via EDGE_E2E_FIXTURE_URL=http://127.0.0.1:<port>/ - still a real
// cross-origin native-fetch leg, just served locally. og:image / og:url in the fixture
// are ABSOLUTE (they name the Pages URL), so the extracted card still exact-matches the
// frozen EXPECTED table regardless of where the page is served from. (Cross-origin
// against the live Pages deploy is exercised by the deployed jobs on master.)
//
// This does NOT change tier2.mjs's default target - it only supplies an override.
//
// Usage: node test/edge/serve-fixture.mjs   (PORT env overrides, default 8787)

import {readFileSync, statSync} from 'node:fs'
import {createServer} from 'node:http'
import {dirname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, 'fixture')
const port = Number(process.env.PORT) || 8787
const host = '127.0.0.1'

// Serve a file from within the fixture dir; '/' maps to index.html. Path traversal
// outside the fixture dir is refused. The fixture ships only index.html, but keep the
// mapping generic so a future asset (e.g. card.png) served here would also work.
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname.endsWith('/')) pathname += 'index.html'
    const filePath = normalize(join(fixtureDir, pathname))
    if (!filePath.startsWith(fixtureDir) || !statSync(filePath).isFile()) {
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'})
      res.end('not found')
      return
    }
    const type = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'
    res.writeHead(200, {'content-type': type})
    res.end(readFileSync(filePath))
  } catch {
    res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'})
    res.end('not found')
  }
})

server.listen(port, host, () => {
  console.log(`serve-fixture: serving ${fixtureDir} at http://${host}:${port}/`)
})
