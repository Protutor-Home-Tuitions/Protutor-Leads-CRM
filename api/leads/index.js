import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole, applyLeadFilter, mapLead } from '../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'GET, POST')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return

  // ── GET /api/leads ────────────────────────────────────────────
  // Supports optional pagination & filtering via query params:
  //   ?status=open&city=Bangalore&limit=100&offset=0
  if (req.method === 'GET') {
    const limit  = Math.min(parseInt(req.query.limit, 10) || 500, 1000)
    const offset = parseInt(req.query.offset, 10) || 0

    let query = supabase
      .from('leads')
      .select('*, call_logs(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (req.query.status) query = query.eq('status', req.query.status)
    if (req.query.city)   query = query.eq('city', req.query.city)

    query = applyLeadFilter(query, user)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ leads: (data || []).map(mapLead) })
  }

  // ── POST /api/leads ───────────────────────────────────────────
  if (req.method === 'POST') {
    if (!requireRole(res, user, 'manager', 'coordinator')) return

    const b = await parseBody(req)
    const { data, error } = await supabase
      .from('leads')
      .insert({
        parent_name:      b.parentName  || '',
        student_name:     b.studentName || '',
        country_code:     b.countryCode || '91',
        mobile:           b.mobile,
        city:             b.city,
        locality:         b.locality    || '',
        standard:         b.standard    || '',
        subjects:         b.subjects    || '',
        source:           b.source,
        entry_date:       b.entryDate   || new Date().toISOString().split('T')[0],
        email:            b.email       || '',
        tutor_gender:     b.tutorGender || null,
        importance_level: b.importance  || null,
        class_mode:       b.classMode   || null,
        notes:            b.notes       || '',
        added_by:         user.id,
        added_by_name:    user.fname,
      })
      .select('*, call_logs(*)')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ lead: mapLead(data) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
