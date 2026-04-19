import { supabase } from '../../../lib/supabase.js'
import { requireAuth, requireRole, mapLead } from '../../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = requireAuth(req, res)
  if (!user) return

  const id = req.query.id

  // ── PUT /api/leads/:id ────────────────────────────────────────
  if (req.method === 'PUT') {
    if (!requireRole(res, user, 'manager', 'coordinator')) return
    const b = req.body
    const { data, error } = await supabase
      .from('leads')
      .update({
        parent_name:      b.parentName    || '',
        student_name:     b.studentName   || '',
        country_code:     b.countryCode   || '91',
        mobile:           b.mobile,
        city:             b.city,
        locality:         b.locality      || '',
        standard:         b.standard      || '',
        subjects:         b.subjects      || '',
        source:           b.source,
        entry_date:       b.entryDate,
        email:            b.email         || '',
        tutor_gender:     b.tutorGender   || null,
        importance_level: b.importance    || null,
        class_mode:       b.classMode     || null,
        notes:            b.notes         || '',
      })
      .eq('id', id)
      .select(`*, call_logs(*)`)
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ lead: mapLead(data) })
  }

  // ── DELETE /api/leads/:id ─────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!requireRole(res, user, 'manager')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
