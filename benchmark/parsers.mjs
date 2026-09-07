// One task, defined identically for every library: from an HTML string, return
// every <meta> and <link> tag as a plain attributes object. This is the real
// job hypertag is built for, so the comparison is like for like.
//
// `loadOne` dynamically imports exactly one library, so the memory benchmark
// can measure each in its own process without the others loaded.
//
// The field spans the range a reader actually chooses between: tiny tag/AST
// readers (hypertag, html5parser), lightweight simplified-DOM parsers
// (node-html-parser), streaming/low-level (htmlparser2), spec parsers (parse5),
// fast light DOMs (linkedom, domino), and full DOM/jQuery stacks (cheerio,
// jsdom). fast-html is intentionally excluded: it is unmaintained (v0.1.2, last
// published ~2016) and its documented API returns undefined on modern Node.

import hypertag from '../hypertag.mjs'

export const NAMES = [
  'hypertag',
  'html5parser',
  'node-html-parser',
  'htmlparser2',
  'parse5',
  'linkedom',
  'domino',
  'cheerio',
  'jsdom'
]

export async function loadOne(name) {
  switch (name) {
    case 'hypertag':
      return html => hypertag(html, ['meta', 'link'])

    case 'html5parser': {
      const {parse} = await import('html5parser')
      return html => {
        const out = []
        const walk = node => {
          if (node.type === 'Tag' && (node.name === 'meta' || node.name === 'link')) {
            const attrs = {}
            for (const a of node.attributes) {
              attrs[a.name.value] = a.value ? a.value.value : true
            }
            out.push(attrs)
          }
          if (node.body) {
            for (const child of node.body) {
              walk(child)
            }
          }
        }
        for (const node of parse(html)) {
          walk(node)
        }
        return out
      }
    }

    case 'node-html-parser': {
      const {parse} = await import('node-html-parser')
      return html => parse(html).querySelectorAll('meta, link').map(el => ({...el.attributes}))
    }

    case 'htmlparser2': {
      const {Parser} = await import('htmlparser2')
      return html => {
        const out = []
        const parser = new Parser({
          onopentag(tag, attribs) {
            if (tag === 'meta' || tag === 'link') {
              out.push({...attribs})
            }
          }
        })
        parser.write(html)
        parser.end()
        return out
      }
    }

    case 'parse5': {
      const parse5 = await import('parse5')
      return html => {
        const out = []
        const walk = node => {
          if (node.tagName === 'meta' || node.tagName === 'link') {
            const attrs = {}
            for (const a of node.attrs) {
              attrs[a.name] = a.value
            }
            out.push(attrs)
          }
          if (node.childNodes) {
            for (const child of node.childNodes) {
              walk(child)
            }
          }
        }
        walk(parse5.parse(html))
        return out
      }
    }

    case 'linkedom': {
      const {parseHTML} = await import('linkedom')
      return html => {
        const {document} = parseHTML(html)
        return [...document.querySelectorAll('meta, link')].map(el =>
          Object.fromEntries([...el.attributes].map(a => [a.name, a.value]))
        )
      }
    }

    case 'domino': {
      const domino = (await import('domino')).default
      return html => {
        const doc = domino.createDocument(html)
        return [...doc.querySelectorAll('meta, link')].map(el =>
          Object.fromEntries([...el.attributes].map(a => [a.name, a.value]))
        )
      }
    }

    case 'cheerio': {
      const {load} = await import('cheerio')
      return html => load(html)('meta, link').map((_i, el) => ({...el.attribs})).get()
    }

    case 'jsdom': {
      const {JSDOM} = await import('jsdom')
      return html => {
        const {document} = new JSDOM(html).window
        return [...document.querySelectorAll('meta, link')].map(el =>
          Object.fromEntries([...el.attributes].map(a => [a.name, a.value]))
        )
      }
    }

    default:
      throw new Error(`unknown parser: ${name}`)
  }
}

export async function loadParsers() {
  const parsers = {}
  for (const name of NAMES) {
    parsers[name] = await loadOne(name)
  }
  return parsers
}

// The minimal source each library needs to do the task, bundled by size.mjs to
// measure "how much JavaScript you ship to use this capability". These may do
// less than the loadOne cases (some stop before the .map); that is fine, since
// size.mjs only measures which library code the bundler pulls in, and the
// import plus one call already pulls all of it.
export const importSnippets = {
  hypertag: "import parse from '../hypertag.mjs'; export const run = h => parse(h, ['meta','link'])",
  html5parser: "import {parse} from 'html5parser'; export const run = h => parse(h)",
  'node-html-parser': "import {parse} from 'node-html-parser'; export const run = h => parse(h).querySelectorAll('meta, link').map(el=>({...el.attributes}))",
  htmlparser2: "import {Parser} from 'htmlparser2'; export const run = h => { const o=[]; const p=new Parser({onopentag(n,a){if(n==='meta'||n==='link')o.push({...a})}}); p.write(h); p.end(); return o }",
  parse5: "import * as parse5 from 'parse5'; export const run = h => parse5.parse(h)",
  linkedom: "import {parseHTML} from 'linkedom'; export const run = h => parseHTML(h)",
  domino: "import domino from 'domino'; export const run = h => domino.createDocument(h)",
  cheerio: "import {load} from 'cheerio'; export const run = h => load(h)('meta, link').map((i,el)=>({...el.attribs})).get()",
  jsdom: "import {JSDOM} from 'jsdom'; export const run = h => new JSDOM(h).window.document.querySelectorAll('meta, link')"
}
