import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole, applyLeadFilter, mapLead } from '../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

// Helper — build the row payload for insert/update.
// Includes the new form-captured fields so a manager creating a lead manually
// (e.g. for an online student) can store country, online_location, fees, etc.
function buildLeadRow(b, addedBy) {
  return {
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

    // Form-capture fields (also editable from the manual entry form)
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

    ...(addedBy && {
      added_by:      addedBy.id,
      added_by_name: addedBy.fname,
    }),
  }
}

export default async function handler(req, res) {
  setCors(req, res, 'GET, POST')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return

  // ── GET /api/leads ────────────────────────────────────────────
  // Supports optional pagination & filtering via query params:
  //   ?status=open&city=Bangalore&limit=100&offset=0
  if (req.method === 'GET') {
    const limit  = Math.min(parseInt(req.query.limit, 10) || 1000, 5000)
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
    if (!b.mobile) return res.status(400).json({ error: 'mobile is required' })

    const { data, error } = await supabase
      .from('leads')
      .insert(buildLeadRow(b, user))
      .select('*, call_logs(*)')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ lead: mapLead(data) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
