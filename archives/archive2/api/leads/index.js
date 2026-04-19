import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole, applyLeadFilter, mapLead } from '../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = requireAuth(req, res)
  if (!user) return

  // ── GET /api/leads ────────────────────────────────────────────
  if (req.method === 'GET') {
    let query = supabase
      .from('leads')
      .select(`*, call_logs(*)`)
      .order('created_at', { ascending: false })

    query = applyLeadFilter(query, user)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ leads: (data || []).map(mapLead) })
  }

  // ── POST /api/leads ───────────────────────────────────────────
  if (req.method === 'POST') {
    if (!requireRole(res, user, 'manager', 'coordinator')) return

    const b = req.body
    const { data, error } = await supabase
      .from('leads')
      .insert({
        parent_name:     b.parentName     || '',
        student_name:    b.studentName    || '',
        country_code:    b.countryCode    || '91',
        mobile:          b.mobile,
        city:            b.city,
        locality:        b.locality       || '',
        standard:        b.standard       || '',
        subjects:        b.subjects       || '',
        source:          b.source,
        entry_date:      b.entryDate      || new Date().toISOString().split('T')[0],
        email:           b.email          || '',
        tutor_gender:    b.tutorGender    || null,
        importance_level: b.importance    || null,
        class_mode:      b.classMode      || null,
        notes:           b.notes          || '',
        added_by_name:   user.fname,
      })
      .select(`*, call_logs(*)`)
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ lead: mapLead(data) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
