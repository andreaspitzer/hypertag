import {readFileSync} from 'node:fs'
import test from 'ava'
import parse from '../parse.js'

const {stripComments} = parse
const html = readFileSync(new URL('./fixture-qualcomm.html', import.meta.url), 'utf-8')

test('it can strip comments from developer.qualcomm.com', t => {
  t.notThrows(() => stripComments(html))
})

test('it can parse developer.qualcomm.com', t => {
  t.notThrows(() => parse(html))
})
