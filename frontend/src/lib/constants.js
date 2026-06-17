// ─────────────────────────────────────────────────────────────────────────────
// src/lib/constants.js
// All dropdown options, status lists, city lists — edit here to change app-wide
// ─────────────────────────────────────────────────────────────────────────────

export const CITIES = [
  'Bangalore', 'Chennai', 'Mumbai', 'Hyderabad', 'Delhi',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
  // 'Online' is a virtual city used for routing online tuition leads to
  // coordinators who handle them. Online leads have their actual location
  // stored in the `online_location` field (Dubai, London, Pune etc.).
  'Online',
]

export const LEAD_SOURCES = [
  'Website', 'Ref by Parent', 'Ref by Tutor', 'Web call',
  'Instagram', 'Facebook', 'Google', 'Walk-in',
  // The client intake form (findtutor.protutor.in) writes one of these
  // based on the ?r=<code> URL parameter the staff member used.
  'Form', 'Form - Call', 'Form - WhatsApp', 'Form - Old Client', 'Form - Website',
  'Other',
]

export const CALL_STATUSES = [
  'Interested',
  'Not Interested',
  'Call Back',
  'No Answer',
  'Check with Family',
  'Demo Scheduled',
  'Demo Done',
  'Tutor Assigned',
  'Closed',
]

export const OPEN_STATUSES = [
  'Interested', 'Call Back', 'Check with Family', 'Demo Scheduled',
]

// Must match the class_mode_enum values in Supabase exactly.
// 'Offline' covers home tuition; 'Any' means no preference.
export const CLASS_MODES = ['Online', 'Offline', 'Any']

export const TUTOR_GENDERS = ['Male', 'Female', 'No Preference']

export const IMPORTANCE_LEVELS = ['High', 'Medium', 'Low']

export const STANDARDS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  'UG', 'PG', 'Other',
]

export const ROLES = ['manager', 'coordinator', 'support']

export const CALL_DATA_CATEGORIES = [
  'Inbound', 'Outbound', 'WhatsApp', 'Missed Call', 'Other',
]

// Status badge colors
export const STATUS_COLORS = {
  open:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  closed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Open:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Closed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Active: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Inactive:{ bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
}

// Brand colors
export const BRAND = {
  primary:   '#1F2F54',
  accent:    '#16a34a',
  accentHover: '#15803d',
  danger:    '#dc2626',
  warning:   '#d97706',
  bg:        '#f5f6fa',
  card:      '#ffffff',
  border:    '#e5e7eb',
  textMain:  '#111827',
  textSub:   '#6b7280',
  textMuted: '#9ca3af',
}
