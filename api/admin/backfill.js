// ═══════════════════════════════════════════════════════════════════
// ADMIN endpoint — one-time backfill of historical Sheets rows.
//
// Accepts a JSON array of leads (each with request_id) and inserts only
// those whose request_id is NOT already in the leads table. Existing rows
// are left untouched. Safe to re-run.
//
// AUTHENTICATION
// Requires an Authorization header matching the ADMIN_SECRET env var.
// Without it, this endpoint refuses everything.
//
// USAGE
//   curl -X POST https://leads.protutor.co.in/api/admin/backfill \
//     -H "Authorization: Bearer <ADMIN_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"leads":[ ... ]}'
// ═══════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

function clean(v, n) {
  if (v == null) return ''
  const s = String(v).trim()
  return s.length > n ? s.slice(0, n) : s
}
function cleanOrNull(v, n) { const s = clean(v, n); return s === '' ? null : s }
function digitsOnly(v, n) { return clean(v, n).replace(/[^0-9]/g, '') }

function normalizeClassMode(v) {
  const x = clean(v, 30).toLowerCase()
  if (x === 'online' || x === 'on') return 'Online'
  if (x === 'home' || x === 'offline' || x === 'home tuition') return 'Offline'
  if (x === 'any') return 'Any'
  return null
}
function normalizeGender(v) {
  const x = clean(v, 20).toLowerCase()
  if (x === 'male')   return 'Male'
  if (x === 'female') return 'Female'
  if (x === 'any')    return 'Any'
  return null
}
function normalizeQuote(v) {
  const x = clean(v, 10).toLowerCase()
  if (x === 'yes')     return 'Yes'
  if (x === 'no')      return 'No'
  if (x === 'pending') return 'Pending'
  return 'Pending'
}

export default async function handler(req, res) {
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth.
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return res.status(500).json({ error: 'Server missing ADMIN_SECRET' })
  }
  const auth = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (auth !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = await parseBody(req)
  const rows = Array.isArray(body.leads) ? body.leads : []
  if (rows.length === 0) {
    return res.status(400).json({ error: 'No leads provided' })
  }

  // Find which request_ids already exist so we skip them.
  const incomingIds = rows.map(r => clean(r.request_id, 64)).filter(Boolean)
  const { data: existing, error: lookupErr } = await supabase
    .from('leads')
    .select('request_id')
    .in('request_id', incomingIds)
  if (lookupErr) {
    return res.status(500).json({ error: 'Lookup failed: ' + lookupErr.message })
  }
  const existingSet = new Set((existing || []).map(r => r.request_id))

  // Build the rows to insert.
  const toInsert = []
  const skipped = []
  const errors = []

  for (const r of rows) {
    const requestId = clean(r.request_id, 64)
    if (!requestId) { errors.push({ reason: 'missing request_id', row: r }); continue }
    if (existingSet.has(requestId)) { skipped.push(requestId); continue }

    const mobile = digitsOnly(r.mobile, 20)
    if (!mobile || mobile.length < 7) {
      errors.push({ request_id: requestId, reason: 'invalid mobile' })
      continue
    }

    // Combine class + board if separate (Sheet has them separate).
    const cls = clean(r.standard || r.class, 50)
    const brd = clean(r.board, 50)
    const standardCombined = clean([cls, brd].filter(Boolean).join(' '), 100)

    // Sheet stores 'Online' / 'Home Tuition'; we normalize same as live API.
    const classMode = normalizeClassMode(r.class_mode || r.classMode)

    const parentName = clean(r.parent_name || r.parentName, 200)
    const city = clean(r.city, 50)

    toInsert.push({
      request_id:       requestId,
      source:           clean(r.source, 50) || 'Form',
      parent_name:      parentName || 'Unknown',
      student_name:     clean(r.student_name || r.studentName, 200),
      mobile:           mobile,
      country_code:     digitsOnly(r.country_code || r.countryCode, 5) || '91',
      standard:         standardCombined,
      subjects:         clean(r.subjects, 1000),
      class_mode:       classMode,
      tutor_gender:     normalizeGender(r.tutor_gender || r.tutorGender),
      city:             city,
      locality:         clean(r.locality, 200),
      notes:            clean(r.notes, 5000),
      country:          cleanOrNull(r.country, 100),
      latitude:         cleanOrNull(r.latitude, 32),
      longitude:        cleanOrNull(r.longitude, 32),
      location_address: cleanOrNull(r.location_address || r.locationAddress, 2000),
      maps_link:        cleanOrNull(r.maps_link || r.mapsLink, 2000),
      days_per_week:    cleanOrNull(r.days_per_week || r.daysPerWeek, 20),
      hours_per_session:cleanOrNull(r.hours_per_session || r.hoursPerSession, 20),
      hourly_fee:       cleanOrNull(r.hourly_fee || r.hourlyFee, 60),
      monthly_estimate: cleanOrNull(r.monthly_estimate || r.monthlyEstimate, 120),
      quote_accepted:   normalizeQuote(r.quote_accepted || r.quoteAccepted),
      expected_quote:   cleanOrNull(r.expected_quote || r.myQuote, 60),
      data_quality:     (parentName && mobile && classMode && city) ? 'complete' : 'partial',
      added_by_name:    'Backfill',
    })
  }

  let insertedCount = 0
  if (toInsert.length > 0) {
    // Insert in chunks of 100 to keep request size reasonable.
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100)
      const { error } = await supabase.from('leads').insert(chunk)
      if (error) {
        return res.status(500).json({
          error: 'Insert failed mid-batch: ' + error.message,
          inserted_so_far: insertedCount,
          chunk_start: i,
        })
      }
      insertedCount += chunk.length
    }
  }

  return res.status(200).json({
    received:  rows.length,
    inserted:  insertedCount,
    skipped:   skipped.length,
    errors:    errors.length,
    error_details: errors.slice(0, 10),
  })
}
