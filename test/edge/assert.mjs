// Tiny runtime-agnostic assert helpers for the edge e2e harness.
//
// Deliberately NOT `node:assert`: this module has to run unchanged on
// Cloudflare Workers and Vercel Edge (tickets 04/06), where `node:` builtins
// are not guaranteed. Pure JS, zero dependencies, throws on failure.
//
// API (reused by tickets 12-15): `ok`, `equal`, `deepEqual`. Every helper
// throws an AssertionError on failure and returns nothing on success.

export class AssertionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AssertionError'
  }
}

const show = value => {
  try {
    return typeof value === 'string' ? JSON.stringify(value) : String(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

// Assert `value` is truthy.
export function ok(value, message) {
  if (!value) {
    throw new AssertionError(message || `expected truthy value, got ${show(value)}`)
  }
}

// Assert `actual` and `expected` are the same primitive (Object.is semantics:
// NaN equals NaN, +0 and -0 differ). Mirrors node:assert's strictEqual.
export function equal(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    throw new AssertionError(message || `expected ${show(expected)}, got ${show(actual)}`)
  }
}

// Structural equality for the plain values the harness compares
// (primitives, arrays, plain objects). Not a general-purpose deep-equal.
function isDeepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false

  const aArray = Array.isArray(a)
  if (aArray !== Array.isArray(b)) return false
  if (aArray) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false
    }
    return true
  }

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!Object.hasOwn(b, key)) return false
    if (!isDeepEqual(a[key], b[key])) return false
  }
  return true
}

// Assert `actual` and `expected` are structurally equal.
export function deepEqual(actual, expected, message) {
  if (!isDeepEqual(actual, expected)) {
    throw new AssertionError(message || `deep equality failed: got ${show(actual)}`)
  }
}
