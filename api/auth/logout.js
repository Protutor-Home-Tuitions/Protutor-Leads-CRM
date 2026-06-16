import { setCors, handledPreflight } from '../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  // JWT is stateless — logout is handled client-side by deleting the token.
  // For server-side revocation, add a token blocklist table here.
  return res.status(200).json({ message: 'Logged out' })
}
