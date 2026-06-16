import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole, mapCallData } from '../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'GET, POST')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return

  // ── GET /api/call-data ────────────────────────────────────────
  if (req.method === 'GET') {
    const limit  = Math.min(parseInt(req.query.limit, 10) || 500, 1000)
    const offset = parseInt(req.query.offset, 10) || 0

    let query = supabase
      .from('call_data')
      .select('*, call_logs(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (req.query.status) query = query.eq('status', req.query.status)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ numbers: (data || []).map(mapCallData) })
  }

  // ── POST /api/call-data ───────────────────────────────────────
  if (req.method === 'POST') {
    // Was previously unguarded — now restricted to manager/coordinator.
    if (!requireRole(res, user, 'manager', 'coordinator')) return

    const b = await parseBody(req)
    const { data, error } = await supabase
      .from('call_data')
      .insert({
        country_code:  b.countryCode || '91',
        phone:         b.phone,
        name:          b.name        || '',
        city:          b.city        || null,
        category:      b.category    || null,
        source:        b.source      || null,
        entry_date:    b.entryDate   || new Date().toISOString().split('T')[0],
        added_by:      user.id,
        added_by_name: user.fname,
      })
      .select('*, call_logs(*)')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ number: mapCallData(data) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
