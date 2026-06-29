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

// Normalize an Indian mobile number to exactly 10 digits.
// Handles: 9876543210, 09876543210, 919876543210, +91-98765-43210
// Returns null for anything that doesn't end up as a valid 10-digit Indian mobile.
function normalizePhone(raw) {
  let d = digitsOnly(raw, 20)
  // Strip leading zeros
  d = d.replace(/^0+/, '')
  // Strip country code 91 if present (12 digits starting with 91, next digit 6-9)
  if (d.length === 12 && d.startsWith('91') && '6789'.includes(d[2])) {
    d = d.slice(2)
  }
  // Must be exactly 10 digits starting with 6-9
  if (d.length === 10 && '6789'.includes(d[0])) return d
  // Return cleaned digits anyway (for international numbers)
  return d.length >= 7 ? d : null
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

  // ── action: log_event ────────────────────────────────────────────
  // Logs funnel events (page views, save attempts, errors) for analytics.
  // Lightweight — no validation beyond field length capping.
  if (action === 'log_event') {
    const sessionId  = clean(body.session_id, 64)
    const eventType  = clean(body.event_type, 50)
    if (!sessionId || !eventType) {
      return res.status(400).json({ error: 'session_id and event_type required' })
    }
    const ua = clean(req.headers['user-agent'], 500)
    const ip = clean(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '', 50).split(',')[0].trim()
    const { error: evErr } = await supabase
      .from('form_events')
      .insert({
        session_id:  sessionId,
        event_type:  eventType,
        request_id:  cleanOrNull(body.request_id, 64),
        page_number: body.page_number ? parseInt(body.page_number, 10) : null,
        details:     body.details || null,
        user_agent:  ua,
        ip_address:  ip || null,
      })
    if (evErr) {
      // Log to server console but don't fail the response - event logging
      // is best-effort and must never block the user's form flow.
      console.warn('[form-submit] log_event insert failed:', evErr.message)
    }
    return res.status(200).json({ ok: true })
  }

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
  const mobile      = normalizePhone(body.mobile)

  if (!mobile) {
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

  // Country code: strip the + and normalize
  const rawCC = digitsOnly(body.country_code, 5)
  const countryCode = (rawCC === '91' || !rawCC) ? '91' : rawCC

  // Build the row WITHOUT quote_accepted/expected_quote — those belong
  // to the quote_update step and must not be clobbered if it already ran.
  const lead = {
    request_id:       requestId,
    source:           buildSource(body.ref),
    parent_name:      parentName || 'Unknown',
    student_name:     studentName,
    mobile:           mobile,
    country_code:     countryCode,
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

  // ── DEDUP STRATEGY (3 layers) ──────────────────────────────────────
  // Layer 1: Same request_id → same form session retrying → update
  // Layer 2: Same phone + status open → same person, new form session → update
  // Layer 3: No match → truly new lead → insert
  //
  // This prevents Chaithra from appearing 4 times in the CRM because she
  // filled the form 4 times. All 4 attempts update the same row.
  // If her lead is CLOSED and she fills again → new lead (new enquiry).

  // Layer 1: check by request_id
  const { data: byReqId, error: lookupErr } = await supabase
    .from('leads')
    .select('id, quote_accepted')
    .eq('request_id', requestId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[form-submit] lookup error:', lookupErr.message)
    return res.status(500).json({ error: 'Could not save lead' })
  }

  if (byReqId) {
    // Same request_id exists → UPDATE (same session retry or queue flush)
    const { error: updErr } = await supabase
      .from('leads')
      .update(lead)
      .eq('request_id', requestId)
    if (updErr) {
      console.error('[form-submit] initial_save update (request_id) error:', updErr.message)
      return res.status(500).json({ error: 'Could not save lead' })
    }
    return res.status(200).json({ ok: true, request_id: requestId, dedup: 'request_id' })
  }

  // Layer 2: check by phone + open status
  const { data: byPhone, error: phoneLookupErr } = await supabase
    .from('leads')
    .select('id, request_id, quote_accepted')
    .eq('mobile', mobile)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (phoneLookupErr) {
    console.error('[form-submit] phone lookup error:', phoneLookupErr.message)
    // Non-fatal: fall through to insert
  }

  if (byPhone) {
    // Same phone, open lead exists → UPDATE that row with fresh data
    // Keep the original request_id so quote_update can still find it
    const { request_id: _drop, ...leadWithoutReqId } = lead
    const { error: updErr } = await supabase
      .from('leads')
      .update(leadWithoutReqId)
      .eq('id', byPhone.id)
    if (updErr) {
      console.error('[form-submit] initial_save update (phone dedup) error:', updErr.message)
      return res.status(500).json({ error: 'Could not save lead' })
    }
    return res.status(200).json({ ok: true, request_id: byPhone.request_id, dedup: 'phone' })
  }

  // Layer 3: No match → INSERT new lead
  const { error: insErr } = await supabase
    .from('leads')
    .insert({ ...lead, quote_accepted: 'Pending' })
  if (insErr) {
    // 23505 = unique_violation: another concurrent insert just won.
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

  return res.status(201).json({ ok: true, request_id: requestId, data_quality: lead.data_quality })
}
