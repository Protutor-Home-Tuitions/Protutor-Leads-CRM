import { supabase } from '../../../lib/supabase.js'
import { requireAuth, requireRole, mapLead, assertCanAccessLead } from '../../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'GET, PUT, DELETE')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return

  const id = req.query.id

  // ── PUT /api/leads/:id ────────────────────────────────────────
  if (req.method === 'PUT') {
    if (!requireRole(res, user, 'manager', 'coordinator')) return
    // City-scoped: can't edit a lead outside your cities.
    if ((await assertCanAccessLead(res, user, id)) === null) return

    const b = await parseBody(req)
    const { data, error } = await supabase
      .from('leads')
      .update({
        parent_name:      b.parentName  || '',
        student_name:     b.studentName || '',
        country_code:     b.countryCode || '91',
        mobile:           b.mobile,
        city:             b.city,
        locality:         b.locality    || '',
        standard:         b.standard    || '',
        subjects:         b.subjects    || '',
        source:           b.source,
        entry_date:       b.entryDate,
        email:            b.email       || '',
        tutor_gender:     b.tutorGender || null,
        importance_level: b.importance  || null,
        class_mode:       b.classMode   || null,
        notes:            b.notes       || '',
      })
      .eq('id', id)
      .select('*, call_logs(*)')
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
