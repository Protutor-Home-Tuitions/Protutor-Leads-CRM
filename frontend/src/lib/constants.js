// Cities (Feature 1: "Online" added before "Others")
export const CITIES = [
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Mumbai',
  'Pune',
  'Kolkata',
  'Online',
  'Others',
];

// Cities shown as checkboxes in the Add/Edit Employee modals (excludes "Others")
export const CITIES_FOR_USERS = CITIES.filter((c) => c !== 'Others');

// Source dropdown values (Add/Edit lead form)
export const SOURCES = [
  'Website',
  'Web call',
  'Ref by Parent',
  'Ref by Tutor',
  'Google',
  'Old client',
  'Repeat clients',
  'Whatsapp',
  'Others',
];

// Call statuses — Open, part 1
export const STATUSES_OPEN_PART1 = [
  'Qualified',
  'Not Attended',
  'Not Connected',
  'Not Reachable',
  'Busy',
  'Switch Off',
];

// Call statuses — Open, part 2 (sets follow-up date)
export const STATUSES_OPEN_PART2 = [
  'Call Later',
  'Check with Family',
  'Doubtful',
];

// Statuses that require a follow-up date (same as part 2)
export const STATUSES_NEEDS_FOLLOWUP = [
  'Call Later',
  'Check with Family',
  'Doubtful',
];

// Call statuses — Closed
export const STATUSES_CLOSED = [
  'Created Enquiry',
  'In Mapping',
  'Got Another',
  'Not Interested',
  'Not Required',
  'Low Fee',
  'Not Okay for Subscription',
  'Assigned to Coordinator',
  'Not the Parent Number',
  'Start Later',
  'Outer Area',
  'Added as Tutor',
  'Existing Tutor',
  'Others',
];

// Class modes
export const CLASS_MODES = ['Any', 'Online', 'Offline'];

// Tutor gender options
export const TUTOR_GENDERS = ['Any', 'Male', 'Female'];

// Roles
export const ROLES = ['manager', 'coordinator', 'support'];

// Call-data categories
export const CATEGORIES = ['Client', 'Tutor', 'Unknown'];

// Default empty form state for the Lead modal
export const EMPTY_LEAD = {
  parentName: '',
  studentName: '',
  mobile: '',
  countryCode: '91',
  standard: '',
  subjects: '',
  entryDate: '',
  city: '',
  locality: '',
  source: '',
  email: '',
  tutorGender: '',
  importance: '',
  classMode: '',
  notes: '',
  onlineLocation: '',
};

// Default empty form state for the Add Number modal
export const EMPTY_NUMBER = {
  phone: '',
  name: '',
  city: '',
  category: '',
  source: '',
  entryDate: '',
  countryCode: '91',
};
