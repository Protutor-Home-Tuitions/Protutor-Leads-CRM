import { supabase } from '../../../lib/supabase.js'
import { requireAuth, requireRole, mapCallData } from '../../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'PUT, DELETE')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return
  const id = req.query.id

  if (req.method === 'PUT') {
    // Was previously unguarded — now restricted to manager/coordinator.
    if (!requireRole(res, user, 'manager', 'coordinator')) return

    const b = await parseBody(req)
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
      .select('*, call_logs(*)')
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
