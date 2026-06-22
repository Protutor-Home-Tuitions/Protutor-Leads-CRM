// ═══════════════════════════════════════════════════════════════════
// PUBLIC endpoint — receives client intake form submissions.
//
// PUBLIC = no auth. Written defensively:
//   - only ever inserts/updates rows in the `leads` table
//   - never reads, deletes, or touches any other table
//   - validates and normalizes every field before saving
//   - caps field lengths so an oversized payload can't cause harm
//
// VALIDATION PHILOSOPHY (Policy Y)
// Mobile is the only hard requirement (without it we can't call the lead).
// Everything else can be blank/partial — we save what we have and tag the
// row with data_quality = 'partial' so the CRM team can complete it later.
//
// IDEMPOTENT
// Keyed on request_id. The form's retry + queue layer may resend the same
// payload multiple times; this endpoint collapses retries into one row.
// ═══════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

// ── Helpers ──────────────────────────────────────────────────────────
function clean(value, maxLen) {
  if (value === null || value === undefined) return ''
  const s = String(value).trim()
  return s.length > maxLen ? s.slice(0, maxLen) : s
}
function cleanOrNull(value, maxLen) {
  const s = clean(value, maxLen)
  return s === '' ? null : s
}
function digitsOnly(value, maxLen) {
  return clean(value, maxLen).replace(/[^0-9]/g, '')
}
function normalizeClassMode(value) {
  const v = clean(value, 30).toLowerCase()
  if (v === 'online') return 'Online'
  if (v === 'home' || v === 'offline' || v === 'home tuition') return 'Offline'
  if (v === 'any') return 'Any'
  return null
}
function normalizeGender(value) {
  const v = clean(value, 20).toLowerCase()
  if (v === 'male')   return 'Male'
  if (v === 'female') return 'Female'
  if (v === 'any')    return 'Any'
  return null
}
function normalizeQuote(value) {
  const v = clean(value, 10).toLowerCase()
  if (v === 'yes')     return 'Yes'
  if (v === 'no')      return 'No'
  if (v === 'pending') return 'Pending'
  return null
}

// Referral channel whitelist — values match the CRM dropdown exactly.
const REFERRAL_CHANNELS = {
  c:  'Web call',
  w:  'Whatsapp',
  o:  'Old client',
  wb: 'Website',
}
function buildSource(rawCode) {
  const code = clean(rawCode, 10).toLowerCase()
  return REFERRAL_CHANNELS[code] || 'Form'
}

// Decide overall data quality of an incoming payload.
function classifyQuality(parentName, mobile, classMode, city) {
  if (parentName && mobile && classMode && city) return 'complete'
  return 'partial'
}

// ── Handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = await parseBody(req)
  const action = clean(body.action, 30) || 'initial_save'

  const requestId = clean(body.request_id, 64)
  if (!requestId) {
    return res.status(400).json({ error: 'request_id is required' })
  }

  // ── action: quote_update ──────────────────────────────────────────
  // The row should already exist from initial_save. If it doesn't (out
  // of order arrival, queue flushing in wrong order), we tell the client
  // — they'll re-queue. Note: this is rare; the form always calls
  // initial_save first.
  if (action === 'quote_update') {
    const { data: updated, error } = await supabase
      .from('leads')
      .update({
        quote_accepted:      normalizeQuote(body.quote_accepted),
        expected_quote:      cleanOrNull(body.expected_quote, 60),
        hourly_fee:          cleanOrNull(body.hourly_fee, 60),
        monthly_estimate:    cleanOrNull(body.monthly_estimate, 120),
        subscription_action: cleanOrNull(body.subscription_action, 20),
      })
      .eq('request_id', requestId)
      .select('id')

    if (error) {
      console.error('[form-submit] quote_update error:', error.message)
      return res.status(500).json({ error: 'Could not save quote update' })
    }
    if (!updated || updated.length === 0) {
      // No row matched. Return 409 so client re-queues; eventually the
      // initial_save will catch up and the next flush will succeed.
      console.warn('[form-submit] quote_update: no row for request_id', requestId)
      return res.status(409).json({ error: 'Lead not found yet; will retry' })
    }
    return res.status(200).json({ ok: true, request_id: requestId })
  }

  // ── action: initial_save (default) ─────────────────────────────────
  // POLICY Y: only mobile is required. Everything else can be missing.
  const parentName  = clean(body.parent_name, 200)
  const studentName = clean(body.student_name, 200)
  const mobile      = digitsOnly(body.mobile, 20)

  if (!mobile || mobile.length < 5) {
    return res.status(400).json({ error: 'a valid mobile number is required' })
  }

  const classMode = normalizeClassMode(body.class_mode)
  const rawCity   = clean(body.city, 100)

  // City routing:
  // - Online leads → city is the literal string "Online" (so coordinators
  //   with "Online" in their cities array see them), and the parent's
  //   typed city goes into online_location for the team's reference.
  // - Offline leads → city is the dropdown value (Bangalore / Chennai / ...)
  //   and online_location stays NULL.
  const isOnline = classMode === 'Online'
  const city            = isOnline ? 'Online' : clean(rawCity, 50)
  const onlineLocation  = isOnline ? (rawCity || null) : null

  // Build the row WITHOUT quote_accepted/expected_quote — those belong
  // to the quote_update step and must not be clobbered if it already ran.
  const lead = {
    request_id:       requestId,
    source:           buildSource(body.ref),
    parent_name:      parentName || 'Unknown',
    student_name:     studentName,
    mobile:           mobile,
    country_code:     digitsOnly(body.country_code, 5) || '91',
    standard:         clean(body.standard, 100),
    subjects:         clean(body.subjects, 1000),
    class_mode:       classMode,
    tutor_gender:     normalizeGender(body.tutor_gender),
    city:             city,
    online_location:  onlineLocation,
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

    data_quality:     classifyQuality(parentName, mobile, classMode, city),
    added_by_name:    'Form',
  }

  // Check if the row already exists for this request_id. If it does, we
  // UPDATE only the fields we own (initial_save fields) and leave
  // quote_accepted / expected_quote untouched — those may have been set
  // by a later quote_update call (out-of-order arrival or queue flush).
  const { data: existing, error: lookupErr } = await supabase
    .from('leads')
    .select('id, quote_accepted')
    .eq('request_id', requestId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[form-submit] lookup error:', lookupErr.message)
    return res.status(500).json({ error: 'Could not save lead' })
  }

  if (existing) {
    // Row already exists — UPDATE the initial_save fields only.
    const { error: updErr } = await supabase
      .from('leads')
      .update(lead)
      .eq('request_id', requestId)
    if (updErr) {
      console.error('[form-submit] initial_save update error:', updErr.message)
      return res.status(500).json({ error: 'Could not save lead' })
    }
  } else {
    // New row — INSERT with quote_accepted = 'Pending' as default.
    const { error: insErr } = await supabase
      .from('leads')
      .insert({ ...lead, quote_accepted: 'Pending' })
    if (insErr) {
      // 23505 = unique_violation: another concurrent insert just won.
      // That's fine — the row exists now, retry as update once.
      if (insErr.code === '23505') {
        const { error: retryErr } = await supabase
          .from('leads')
          .update(lead)
          .eq('request_id', requestId)
        if (retryErr) {
          console.error('[form-submit] insert→update retry error:', retryErr.message)
          return res.status(500).json({ error: 'Could not save lead' })
        }
      } else {
        console.error('[form-submit] initial_save insert error:', insErr.message)
        return res.status(500).json({ error: 'Could not save lead' })
      }
    }
  }

  return res.status(201).json({ ok: true, request_id: requestId, data_quality: lead.data_quality })
}
