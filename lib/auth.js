import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { supabase } from './supabase.js'

// JWT secret now comes ONLY from config (environment). The hardcoded
// fallback has been removed.

export function getUser(req) {
  try {
    const header = req.headers.authorization || ''
    const token  = header.replace('Bearer ', '').trim()
    if (!token) return null
    return jwt.verify(token, config.jwtSecret)
  } catch {
    return null
  }
}

export function requireAuth(req, res) {
  const user = getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized — please log in' })
    return null
  }
  return user
}

export function requireRole(res, user, ...allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden — insufficient permissions' })
    return false
  }
  return true
}

export function applyLeadFilter(query, user) {
  if (user.role === 'coordinator') return query.in('city', user.cities)
  if (user.role === 'support') return query.eq('moved_to_support', true).in('city', user.cities)
  return query
}

// ─────────────────────────────────────────────────────────────────────────
// City-scoped write authorization.
//
// Reads were already scoped to a user's cities (applyLeadFilter above), but
// writes (edit / star / call-log / msg) only checked the user's ROLE — so a
// coordinator for one city could modify a lead in another city just by
// knowing its ID. This helper closes that gap: it loads the target lead's
// city and confirms the user is allowed to touch it.
//
// Returns the lead's city string if allowed. If not allowed, it writes the
// correct error response and returns null — callers must stop when it's null.
// ─────────────────────────────────────────────────────────────────────────
export async function assertCanAccessLead(res, user, leadId) {
  // Managers can access every lead.
  if (user.role === 'manager') {
    const { data, error } = await supabase
      .from('leads').select('city').eq('id', leadId).single()
    if (error || !data) {
      res.status(404).json({ error: 'Lead not found' })
      return null
    }
    return data.city
  }

  const { data, error } = await supabase
    .from('leads').select('city, moved_to_support').eq('id', leadId).single()
  if (error || !data) {
    res.status(404).json({ error: 'Lead not found' })
    return null
  }

  const inUserCities = Array.isArray(user.cities) && user.cities.includes(data.city)
  // Support users may only touch leads that were moved to support AND are in
  // one of their cities — mirroring the read filter.
  const supportOk = user.role === 'support' ? data.moved_to_support === true : true

  if (!inUserCities || !supportOk) {
    res.status(403).json({ error: 'Forbidden — lead is outside your assigned cities' })
    return null
  }
  return data.city
}

export function mapLog(log) {
  if (!log) return null
  return {
    n:            log.n,
    status:       log.status,
    notes:        log.notes,
    time:         log.logged_at ? log.logged_at.replace('T', ' ').slice(0, 16) : '',
    calledBy:     log.called_by_name,
    isOpen:       log.is_open,
    followupDate: log.followup_date || '',
  }
}

export function mapLead(row) {
  if (!row) return null
  return {
    id:             row.id,
    parentName:     row.parent_name,
    studentName:    row.student_name,
    countryCode:    row.country_code,
    mobile:         row.mobile,
    city:           row.city,
    locality:       row.locality,
    standard:       row.standard,
    subjects:       row.subjects,
    source:         row.source,
    entryDate:      row.entry_date,
    status:         row.status,
    starred:        row.starred,
    email:          row.email,
    tutorGender:    row.tutor_gender,
    importance:     row.importance_level,
    classMode:      row.class_mode,
    notes:          row.notes,
    addedBy:        row.added_by_name,
    followupDate:   row.followup_date || '',
    msgCount:       row.msg_count,
    movedToSupport: row.moved_to_support,
    callLogs:       (row.call_logs || []).map(mapLog).sort((a, b) => a.n - b.n),
  }
}

export function mapCallData(row) {
  if (!row) return null
  return {
    id:           row.id,
    countryCode:  row.country_code,
    phone:        row.phone,
    name:         row.name,
    city:         row.city,
    category:     row.category,
    source:       row.source,
    entryDate:    row.entry_date,
    status:       row.status,
    followupDate: row.followup_date || '',
    msgCount:     row.msg_count,
    addedBy:      row.added_by_name,
    callLogs:     (row.call_logs || []).map(mapLog).sort((a, b) => a.n - b.n),
  }
}
