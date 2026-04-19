import { supabase } from '../../../lib/supabase.js'
import { requireAuth, requireRole, mapCallData } from '../../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = requireAuth(req, res)
  if (!user) return
  const id = req.query.id

  if (req.method === 'PUT') {
    const b = req.body
    const { data, error } = await supabase
      .from('call_data')
      .update({
        country_code: b.countryCode || '91',
        phone:        b.phone,
        name:         b.name        || '',
        city:         b.city        || null,
        category:     b.category    || null,
        source:       b.source      || null,
        entry_date:   b.entryDate,
      })
      .eq('id', id)
      .select(`*, call_logs(*)`)
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ number: mapCallData(data) })
  }

  if (req.method === 'DELETE') {
    if (!requireRole(res, user, 'manager')) return
    const { error } = await supabase.from('call_data').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
