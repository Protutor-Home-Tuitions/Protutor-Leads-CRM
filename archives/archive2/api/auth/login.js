import { supabase } from '../../lib/supabase.js'
import jwt from 'jsonwebtoken'

const CORS_ORIGIN = process.env.ALLOWED_ORIGINS || '*'
const JWT_SECRET  = process.env.JWT_SECRET || '3aa341e05cdc23452c824fb13a53106fe02d5c6ecd1312605cc3670c788fc34d'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data, error } = await supabase.rpc('verify_user_password', {
    p_email: email.toLowerCase().trim(),
    p_password: password,
  })

  if (error || !data || data.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const user = data[0]
  const token = jwt.sign(
    { id: user.id, fname: user.fname, lname: user.lname, email: user.email, role: user.role, cities: user.cities },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )

  return res.status(200).json({ token, user })
}
