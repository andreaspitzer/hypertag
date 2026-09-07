# hypertag benchmarks

Reproducible speed, size, and memory comparison against the HTML parsers people
actually reach for, spanning tiny tag/AST readers through full DOMs. These live
in their own package so the comparison dependencies (jsdom and cheerio are
heavy) never touch the published `hypertag`.

## Run

```sh
cd benchmark
npm install
npm run bench          # speed, then size, then memory
# or individually:
npm run bench:speed
npm run bench:size
npm run bench:memory
```

## The task

Every library does the exact same job, defined once in `parsers.mjs`: from a
real page (`../test/fixture-twitter.html`, about 90 kB), return every `<meta>`
and `<link>` tag as a plain attributes object. All nine libraries return the
same 79 tags, so the comparison is like for like. `speed.mjs` prints those
counts so you can audit that the task is equal before trusting the numbers.

## The field

Chosen to cover the range a reader actually chooses between:

- **hypertag** and **html5parser** tiny tag / AST readers
- **node-html-parser** lightweight simplified DOM with selectors
- **htmlparser2** streaming, low-level callbacks
- **parse5** spec-compliant HTML5 parser
- **linkedom**, **domino** fast, lightweight DOM implementations
- **cheerio**, **jsdom** full DOM and jQuery-style stacks

Excluded, with reason: **html-tag-parser** parses tags but not attributes, so it
cannot do this task on equal terms. **fast-html** is unmaintained (v0.1.2, last
published ~2016) and its documented API returns `undefined` on modern Node.
Metadata tools like metascraper and open-graph-scraper fetch URLs and apply
fallback rules, a different and larger job.

## What each script measures

- **speed.mjs** ops/sec for the task, via `benchmark`, on a fixed local page (no
  network, reproducible offline).
- **size.mjs** the JavaScript you ship to do the task: a minimal entry per
  library is bundled with esbuild (`--bundle --minify`, esm, Node built-ins
  external) and gzipped. This counts the library's own code, not Node.
- **memory.mjs** peak RSS and retained heap, one child process per library so
  nothing else is loaded, run with `--expose-gc` so retained heap is measured
  after a full collection. Memory is the noisiest of the three: treat it as an
  order-of-magnitude comparison, not a precise figure.

## Sample results (Node 24)

Absolute numbers vary by machine and run. The ratios are the point.

**Speed** (higher is better)

| parser | ops/sec |
| --- | ---: |
| hypertag | 11,742 |
| node-html-parser | 4,444 |
| htmlparser2 | 2,941 |
| html5parser | 2,232 |
| domino | 1,980 |
| linkedom | 1,031 |
| parse5 | 513 |
| cheerio | 353 |
| jsdom | 123 |

**Size** (gzipped, smaller is better)

| parser | gzipped | direct deps |
| --- | ---: | ---: |
| hypertag | 0.8 kB | 0 |
| html5parser | 2.4 kB | 0 |
| htmlparser2 | 27.6 kB | 5 |
| parse5 | 47.2 kB | 2 |
| node-html-parser | 82.9 kB | 3 |
| domino | 90.4 kB | 0 |
| linkedom | 94.6 kB | 6 |
| cheerio | 489 kB | 12 |
| jsdom | 775 kB | 22 |

**Memory** (lower is better)

| parser | peak RSS | retained heap |
| --- | ---: | ---: |
| hypertag | 49.9 MB | ~0 MB |
| html5parser | 57.1 MB | 0.1 MB |
| htmlparser2 | 59.0 MB | 0.2 MB |
| node-html-parser | 63.2 MB | 1.2 MB |
| linkedom | 72.8 MB | 0.7 MB |
| domino | 81.8 MB | 1.3 MB |
| parse5 | 83.7 MB | 0.6 MB |
| cheerio | 166.3 MB | 0.8 MB |
| jsdom | 240.9 MB | 74.5 MB |

## Honest scope

hypertag is first on all three axes, but the nearest competitors are close and
worth knowing: node-html-parser is the fastest of the rest (about 2.6x behind),
and html5parser is the smallest and lightest of the rest (about 3x the size).
hypertag wins because it does less: a single string scan returning plain
objects, with no DOM, tree, or AST built or held. The other libraries are more
capable (selectors, traversal, text content, mutation, spec-correct nesting),
and most parsers here run at the edge too: jsdom cannot (it needs Node's `vm`,
`fs`, and `http`), and cheerio needs a Node-compat flag for `fs`; the other six
are pure JS. They just cost more to ship and run. Pick the tool for the job.
