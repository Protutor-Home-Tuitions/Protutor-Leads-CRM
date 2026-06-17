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

        // Form-capture fields can also be edited manually now
        online_location:  b.onlineLocation || null,
        country:          b.country         || null,
        latitude:         b.latitude        || null,
        longitude:        b.longitude       || null,
        location_address: b.locationAddress || null,
        maps_link:        b.mapsLink        || null,
        days_per_week:    b.daysPerWeek     || null,
        hours_per_session:b.hoursPerSession || null,
        hourly_fee:       b.hourlyFee       || null,
        monthly_estimate: b.monthlyEstimate || null,
        quote_accepted:   b.quoteAccepted   || null,
        expected_quote:   b.expectedQuote   || null,
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
