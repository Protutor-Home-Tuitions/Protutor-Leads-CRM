import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole } from '../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}


// Vercel body parser — body can be undefined without this
async function parseBody(req) {
  if (req.body) return req.body
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
  })
}

export default async function handler(req, res) {
  const body = await parseBody(req)
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

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
    const b = body
    if (!b.email || !b.password || !b.fname) {
      return res.status(400).json({ error: 'fname, email and password are required' })
    }

    // Hash password using Supabase RPC (uses pgcrypto crypt)
    const { data: hash, error: hashErr } = await supabase
      .rpc('hash_password', { p_password: b.password })
    if (hashErr) return res.status(500).json({ error: hashErr.message })

    const { data, error } = await supabase
      .from('users')
      .insert({
        fname:         b.fname,
        lname:         b.lname         || '',
        email:         b.email.toLowerCase().trim(),
        mobile:        b.mobile,
        password_hash: hash,
        role:          b.role          || 'coordinator',
        status:        b.status        || 'Active',
        cities:        b.cities        || [],
      })
      .select('id, fname, lname, email, mobile, role, status, cities')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ user: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
