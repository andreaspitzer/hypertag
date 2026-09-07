#! /usr/bin/env node

let html = `
  <html><head>
    <meta name="hello" content="world">
    <meta name="hello" content="moon">
  </head><body>
    <div><h1>Hello, world!</h1></div>
  </body></html>
`

const Benchmark = require('benchmark')
const htmlTagParser = require('html-tag-parser')
const cheerio = require('cheerio')
const htmlparser2 = require('htmlparser2')
const htmlParseStringify = require('html-parse-stringify')
const fastHtml = require('fast-html')
const parse5 = require('parse5')
const hypertag = require('./hypertag.js')

const suite = (new Benchmark.Suite())
  .add('hypertag', () => {
    hypertag(html, 'meta')
  })
  .add('fast-html', () => {
    fastHtml({parseAttributes: true}).parse(html)
  })
  .add('parse5', () => parse5.parse(html))
  .add('htmlparser2', () => {
    const parser = new htmlparser2.Parser()
    parser.parseComplete(html)
  })
  .add('html-tag-parser', () => {
    htmlTagParser(html, 'meta')
  })
  .add('cheerio', () => {
    cheerio.load(html)('meta')
  })
  .add('html-parse-stringify', () => {
    htmlParseStringify.parse(html)
  })
  .on('cycle', event => {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })

fetch('https://apple.com/')
  .then(response => response.text())
  .then(body => {
    html = body
    suite.run({async: true})
  })
