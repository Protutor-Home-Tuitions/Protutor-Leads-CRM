// ─────────────────────────────────────────────────────────────────────────
// Shared HTTP helpers.
//
// Before this file, every API endpoint copy-pasted the same CORS block and
// the same parseBody function. That meant 11 copies to keep in sync, and
// they had already drifted (some allowed '*', some read the env var). Now
// there is ONE source of truth.
// ─────────────────────────────────────────────────────────────────────────

import { config } from './config.js'

// Works out which Origin header to send back.
// - If you configured a specific list of origins, we echo back the caller's
//   origin only when it's on the list (this is how CORS must work when you
//   want to allow several specific sites).
// - If the list is just '*', we allow everyone (development / open mode).
function resolveAllowedOrigin(req) {
  const requestOrigin = req.headers.origin
  if (config.allowedOrigins.includes('*')) return '*'
  if (requestOrigin && config.allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }
  // Not allowed: fall back to the first configured origin so the browser
  // simply blocks the cross-site call rather than us leaking access.
  return config.allowedOrigins[0] || 'null'
}

// Sets the standard CORS headers on a response.
// `methods` is the list this particular endpoint supports, e.g. 'GET, POST'.
export function setCors(req, res, methods) {
  res.setHeader('Access-Control-Allow-Origin', resolveAllowedOrigin(req))
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
}

// Reads and JSON-parses the request body.
// Vercel sometimes leaves req.body undefined, so we read the raw stream as a
// fallback. Returns {} if the body is empty or not valid JSON.
export async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

// Handles a CORS preflight (OPTIONS) request. Returns true if it handled the
// request (meaning the caller should stop), false otherwise.
export function handledPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  return false
}
