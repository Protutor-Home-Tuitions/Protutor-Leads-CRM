import { supabase } from '../../lib/supabase.js'
import { config } from '../../lib/config.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = await parseBody(req)
  const { email, password } = body
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
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )

  return res.status(200).json({ token, user })
}
