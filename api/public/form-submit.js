// ═══════════════════════════════════════════════════════════════════
// PUBLIC endpoint — receives client intake form submissions.
//
// This endpoint is intentionally UNAUTHENTICATED because the form at
// findtutor.protutor.in has no login. Because it is public, it is written
// defensively:
//   - it ONLY ever inserts/updates rows in the `leads` table
//   - it never reads, deletes, or touches any other table
//   - it validates and normalizes every field before saving
//   - it caps field lengths so an oversized payload can't cause harm
//
// The form calls this twice per session, using the SAME request_id:
//   1. action "initial_save"  → when the parent reaches the quote page
//   2. action "quote_update"   → when the parent accepts/declines the quote
// We use an atomic UPSERT keyed on request_id, so the two calls collapse
// into exactly one lead, regardless of arrival order or retries.
// ═══════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

// ── Helpers ──────────────────────────────────────────────────────────

// Trim a string and cap its length. Returns '' for null/undefined.
function clean(value, maxLen) {
  if (value === null || value === undefined) return ''
  const s = String(value).trim()
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

// Same as clean(), but returns null instead of '' (for nullable columns).
function cleanOrNull(value, maxLen) {
  const s = clean(value, maxLen)
  return s === '' ? null : s
}

// Keep digits only (for phone / dial code). Strips +, spaces, dashes.
function digitsOnly(value, maxLen) {
  const s = clean(value, maxLen).replace(/[^0-9]/g, '')
  return s
}

// Map the form's class-mode wording to the DB enum ('Online'/'Offline'/'Any').
// The DB enum is capitalized, so we normalize whatever the form sends.
function normalizeClassMode(value) {
  const v = clean(value, 30).toLowerCase()
  if (v === 'online') return 'Online'
  if (v === 'home' || v === 'offline' || v === 'home tuition') return 'Offline'
  if (v === 'any') return 'Any'
  return null // unknown → leave null rather than guess
}

// Map gender preference to the DB enum ('Any'/'Male'/'Female').
function normalizeGender(value) {
  const v = clean(value, 20).toLowerCase()
  if (v === 'male') return 'Male'
  if (v === 'female') return 'Female'
  if (v === 'any') return 'Any'
  return null
}

// quote_accepted is constrained to a known set.
function normalizeQuote(value) {
  const v = clean(value, 10).toLowerCase()
  if (v === 'yes') return 'Yes'
  if (v === 'no') return 'No'
  if (v === 'pending') return 'Pending'
  return null
}

// ── Handler ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS: the allowed origins (incl. the form domain) come from the
  // ALLOWED_ORIGINS env var, handled centrally in lib/http.js.
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = await parseBody(req)
  const action = clean(body.action, 30) || 'initial_save'

  // request_id ties the two calls together. It is mandatory.
  const requestId = clean(body.request_id, 64)
  if (!requestId) {
    return res.status(400).json({ error: 'request_id is required' })
  }

  // ── action: quote_update ──────────────────────────────────────────
  // The lead already exists (from initial_save). We only update the
  // quote decision fields. If the row doesn't exist yet (e.g. calls
  // arrived out of order), we still upsert so nothing is lost.
  if (action === 'quote_update') {
    const update = {
      request_id:       requestId,
      quote_accepted:   normalizeQuote(body.quote_accepted),
      expected_quote:   cleanOrNull(body.expected_quote, 60),
      hourly_fee:       cleanOrNull(body.hourly_fee, 60),
      monthly_estimate: cleanOrNull(body.monthly_estimate, 120),
      subscription_action: cleanOrNull(body.subscription_action, 20),
    }

    const { error } = await supabase
      .from('leads')
      .upsert(update, { onConflict: 'request_id' })

    if (error) {
      console.error('[form-submit] quote_update error:', error.message)
      return res.status(500).json({ error: 'Could not save quote update' })
    }
    return res.status(200).json({ ok: true, request_id: requestId })
  }

  // ── action: initial_save (default) ─────────────────────────────────
  // First write. Validate the essentials, then build the full row.
  const parentName  = clean(body.parent_name, 200)
  const studentName = clean(body.student_name, 200)
  const mobile      = digitsOnly(body.mobile, 20)

  if (!parentName)        return res.status(400).json({ error: 'parent_name is required' })
  if (!mobile || mobile.length < 7) {
    return res.status(400).json({ error: 'a valid mobile number is required' })
  }

  const lead = {
    request_id:       requestId,
    source:           'Form',
    parent_name:      parentName,
    student_name:     studentName,
    mobile:           mobile,
    country_code:     digitsOnly(body.country_code, 5) || '91',
    // standard already arrives combined as "Class 7 CBSE" from the form.
    standard:         clean(body.standard, 100),
    subjects:         clean(body.subjects, 1000),
    class_mode:       normalizeClassMode(body.class_mode),
    tutor_gender:     normalizeGender(body.tutor_gender),
    city:             clean(body.city, 50),
    locality:         clean(body.locality, 200),
    notes:            clean(body.notes, 5000),

    // Form-specific extras
    country:          cleanOrNull(body.country, 100),
    latitude:         cleanOrNull(body.latitude, 32),
    longitude:        cleanOrNull(body.longitude, 32),
    location_address: cleanOrNull(body.location_address, 2000),
    maps_link:        cleanOrNull(body.maps_link, 2000),
    days_per_week:    cleanOrNull(body.days_per_week, 20),
    hours_per_session:cleanOrNull(body.hours_per_session, 20),
    hourly_fee:       cleanOrNull(body.hourly_fee, 60),
    monthly_estimate: cleanOrNull(body.monthly_estimate, 120),
    quote_accepted:   normalizeQuote(body.quote_accepted) || 'Pending',
    expected_quote:   cleanOrNull(body.expected_quote, 60),

    added_by_name:    'Form',
  }

  // Atomic upsert keyed on request_id. If the parent's browser retries
  // the initial_save, ON CONFLICT keeps it to one row instead of two.
  const { error } = await supabase
    .from('leads')
    .upsert(lead, { onConflict: 'request_id' })

  if (error) {
    console.error('[form-submit] initial_save error:', error.message)
    return res.status(500).json({ error: 'Could not save lead' })
  }

  return res.status(201).json({ ok: true, request_id: requestId })
}
