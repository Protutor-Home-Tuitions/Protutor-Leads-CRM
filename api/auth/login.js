import { supabase } from '../../lib/supabase.js'
import { config } from '../../lib/config.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = await parseBody(req)
  const { username, password } = body

  // Support legacy 'email' field for backward compatibility
  const loginId = (username || body.email || '').toLowerCase().trim()

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  // Step 1: Check if user exists by email OR mobile (no password check yet)
  const { data: found, error: lookupErr } = await supabase
    .from('users')
    .select('id, email, mobile')
    .or(`email.eq.${loginId},mobile.eq.${loginId}`)
    .limit(1)

  if (lookupErr || !found || found.length === 0) {
    // User not found — return 401 with EMPTY error (no hint to attacker)
    return res.status(401).json({ error: '' })
  }

  // Step 2: Verify password using the user's email (RPC expects email)
  const userEmail = found[0].email
  const { data, error } = await supabase.rpc('verify_user_password', {
    p_email: userEmail,
    p_password: password,
  })

  if (error || !data || data.length === 0) {
    // User exists but password is wrong
    return res.status(401).json({ error: 'Incorrect password' })
  }

  const user = data[0]

  // Step 3: Block inactive users
  if (user.status && user.status !== 'Active') {
    return res.status(403).json({ error: 'Your account is inactive. Contact your manager.' })
  }

  // Step 4: Issue JWT
  const token = jwt.sign(
    { id: user.id, fname: user.fname, lname: user.lname, email: user.email, role: user.role, cities: user.cities },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )

  return res.status(200).json({ token, user })
}
