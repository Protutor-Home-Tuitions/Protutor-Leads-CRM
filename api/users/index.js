import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole } from '../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'GET, POST')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return
  if (!requireRole(res, user, 'manager')) return

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, fname, lname, email, mobile, role, status, cities, created_at')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ users: data })
  }

  if (req.method === 'POST') {
    const b = await parseBody(req)
    if (!b.email || !b.password || !b.fname) {
      return res.status(400).json({ error: 'fname, email and password are required' })
    }

    // Hash password using Supabase RPC (pgcrypto bcrypt).
    const { data: hash, error: hashErr } = await supabase
      .rpc('hash_password', { p_password: b.password })
    if (hashErr) return res.status(500).json({ error: hashErr.message })

    const { data, error } = await supabase
      .from('users')
      .insert({
        fname:         b.fname,
        lname:         b.lname  || '',
        email:         b.email.toLowerCase().trim(),
        mobile:        b.mobile,
        password_hash: hash,
        role:          b.role   || 'coordinator',
        status:        b.status || 'Active',
        cities:        b.cities || [],
      })
      .select('id, fname, lname, email, mobile, role, status, cities')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ user: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
