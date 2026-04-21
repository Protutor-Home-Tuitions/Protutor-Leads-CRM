import { supabase } from '../../lib/supabase.js'
import jwt from 'jsonwebtoken'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve({}) } })
  })
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  // POST /api/auth/logout
  if (req.url?.includes('/logout')) {
    return res.status(200).json({ message: 'Logged out' })
  }

  // POST /api/auth/login
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = await parseBody(req)
  const { email, password } = body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data, error } = await supabase.rpc('verify_user_password', {
    p_email: email.toLowerCase().trim(),
    p_password: password,
  })

  if (error || !data?.length) return res.status(401).json({ error: 'Invalid email or password' })

  const user = data[0]
  if (user.status !== 'Active') return res.status(403).json({ error: 'Account is inactive' })

  const secret = process.env.JWT_SECRET
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h'
  const token = jwt.sign(
    { id: user.id, email, fname: user.fname, lname: user.lname, role: user.role, cities: user.cities },
    secret,
    { expiresIn }
  )

  return res.json({ token, user: { id: user.id, fname: user.fname, lname: user.lname, email, role: user.role, cities: user.cities } })
}
