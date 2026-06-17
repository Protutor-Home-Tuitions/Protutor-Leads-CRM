// ─────────────────────────────────────────────────────────────────────────────
// src/lib/constants.js
// All dropdown options, status lists, city lists — edit here to change app-wide
// Matched to the original CRM's exact values from screenshots.
// ─────────────────────────────────────────────────────────────────────────────

export const CITIES = [
  'Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'Pune', 'Kolkata',
  'Online',  // virtual city for online tuition leads
  'Others',
]

// Exact list from the old CRM Source dropdown (Image 4)
export const LEAD_SOURCES = [
  'Website', 'Web call', 'Ref by Parent', 'Ref by Tutor',
  'Google', 'Old client', 'Repeat clients', 'Whatsapp',
  'Form', 'Form - Call', 'Form - WhatsApp', 'Form - Old Client', 'Form - Website',
  'Others',
]

// Call log statuses grouped exactly as the old CRM modal shows them.
// OPEN STATUS — PART 1: immediate call outcomes
export const CALL_STATUS_OPEN_P1 = [
  'Qualified', 'Not Attended', 'Not Connected', 'Not Reachable', 'Busy', 'Switch Off',
]
// OPEN STATUS — PART 2: sets follow-up date
export const CALL_STATUS_OPEN_P2 = [
  'Call Later', 'Check with Family', 'Doubtful',
]
// CLOSED STATUS
export const CALL_STATUS_CLOSED = [
  'Created Enquiry', 'In Mapping', 'Got Another', 'Not Interested',
  'Not Required', 'Low Fee', 'Not Okay for Subscription',
  'Assigned to Coordinator', 'Not the Parent Number', 'Start Later',
  'Outer Area', 'Added as Tutor', 'Existing Tutor', 'Others',
]

// Combined for reference (all possible values)
export const CALL_STATUSES = [
  ...CALL_STATUS_OPEN_P1, ...CALL_STATUS_OPEN_P2, ...CALL_STATUS_CLOSED,
]

// Which statuses keep the lead "open"
export const OPEN_STATUSES = [...CALL_STATUS_OPEN_P1, ...CALL_STATUS_OPEN_P2]

// Must match the class_mode_enum values in Supabase exactly.
export const CLASS_MODES = ['Online', 'Offline', 'Any']

export const TUTOR_GENDERS = ['Any', 'Male', 'Female']

export const IMPORTANCE_LEVELS = ['High', 'Medium', 'Low']

export const STANDARDS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  'UG', 'PG', 'Other',
]

export const ROLES = ['manager', 'coordinator', 'support']

export const CALL_DATA_CATEGORIES = ['Client', 'Tutor', 'Unknown']

// Status badge colors
export const STATUS_COLORS = {
  open:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  closed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Open:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Closed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Active: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Inactive:{ bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
}

// Brand colors — matched to the original CRM
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
