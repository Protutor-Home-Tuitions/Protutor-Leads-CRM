import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || '3aa341e05cdc23452c824fb13a53106fe02d5c6ecd1312605cc3670c788fc34d'

export function getUser(req) {
  try {
    const header = req.headers.authorization || ''
    const token  = header.replace('Bearer ', '').trim()
    if (!token) return null
    return jwt.verify(token, JWT_SECRET)
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
