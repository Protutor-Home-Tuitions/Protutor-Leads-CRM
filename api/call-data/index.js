import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole, mapCallData } from '../../lib/auth.js'

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

  // ── GET /api/call-data ────────────────────────────────────────
  if (req.method === 'GET') {
    // All roles can see all call data (no city filter)
    const { data, error } = await supabase
      .from('call_data')
      .select(`*, call_logs(*)`)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ numbers: (data || []).map(mapCallData) })
  }

  // ── POST /api/call-data ───────────────────────────────────────
  if (req.method === 'POST') {
    const b = body
    const { data, error } = await supabase
      .from('call_data')
      .insert({
        country_code:  b.countryCode  || '91',
        phone:         b.phone,
        name:          b.name         || '',
        city:          b.city         || null,
        category:      b.category     || null,
        source:        b.source       || null,
        entry_date:    b.entryDate    || new Date().toISOString().split('T')[0],
        added_by_name: user.fname,
      })
      .select(`*, call_logs(*)`)
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ number: mapCallData(data) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
