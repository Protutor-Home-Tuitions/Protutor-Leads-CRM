import { supabase } from '../../lib/supabase.js'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  // CORS headers — allow your Vercel frontend
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  // Call the SQL function we created in Supabase to verify password
  const { data, error } = await supabase.rpc('verify_user_password', {
    p_email: email.toLowerCase().trim(),
    p_password: password,
  })

  if (error || !data || data.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const user = data[0]

  // Sign a JWT with the user's id, role and cities
  const token = jwt.sign(
    {
      id:     user.id,
      fname:  user.fname,
      lname:  user.lname,
      email:  user.email,
      role:   user.role,
      cities: user.cities,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

  return res.status(200).json({ token, user })
}
