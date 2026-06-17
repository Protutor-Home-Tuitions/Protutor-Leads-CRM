# Audit Notes — Issues Found and Fixed

This document records what was wrong with the initial v3 delivery and
what was changed in this audited version. Useful if you ever need to
review *why* certain code looks the way it does.

---

## CRITICAL bugs fixed

### Bug 1 — Edit user button was non-functional

**Where:** `UsersPage.jsx`
**Before:** `<Button variant="ghost" size="sm">✏️ Edit</Button>` — no `onClick`
**After:** Wired to `setEditingUser(u)` which opens AddUserModal in edit mode

### Bug 2 — No delete user functionality

**Where:** `UsersPage.jsx`
**Before:** No delete button anywhere
**After:** Delete button next to Edit, with confirmation prompt and self-protection

### Bug 3 — Backend missing PUT and DELETE for users

**Where:** `api/users/index.js`
**Before:** Only handled GET and POST. PUT/DELETE returned 405
**After:** Routed via `?id=<uuid>` query param to stay within Vercel
Hobby plan's 12-function limit. Includes self-protection (can't demote
or delete yourself).

### Bug 4 — Manual Online lead can't capture parent's typed location

**Where:** `LeadFormModal.jsx`
**Before:** When manager picked city="Online", there was no field for
typing the parent's actual city (Dubai, London, etc.)
**After:** When city='Online' is selected, an "Online Location" input
appears below the form grid

### Bug 5 — Backend silently dropped new form fields on manual edit

**Where:** `api/leads/index.js` (POST) and `api/leads/[id]/index.js` (PUT)
**Before:** Only mapped the original 15 fields; ignored country,
online_location, hourly_fee, etc.
**After:** `buildLeadRow` helper accepts all 12 new form-capture fields

### Bug 6 — mapLead didn't expose new fields to frontend

**Where:** `lib/auth.js` `mapLead()` function
**Before:** Returned 22 fields; the new form columns weren't in the
response, so the frontend's "Form Data" read-only section showed nothing
**After:** Returns 16 additional fields (requestId, country, latitude,
longitude, locationAddress, mapsLink, daysPerWeek, hoursPerSession,
hourlyFee, monthlyEstimate, quoteAccepted, expectedQuote, onlineLocation,
dataQuality, createdDateIst, createdTimeIst)

---

## SERIOUS bug fixed

### Bug 7 — No 401 handling in API client

**Where:** `lib/api.js` `request()` function
**Before:** A 401 response (expired token) just threw an error. The user
saw `alert('Unauthorized')` from each subsequent action but was never
redirected to login. They had to manually refresh or close the tab.
**After:** On 401, the client clears `sessionStorage` and reloads. The
AuthProvider sees no user and shows the login page.

---

## POLISH improvements

### Improvement 8 — Distinct sidebar icons

**Where:** `Sidebar.jsx`
**Before:** Leads and Call Data both used `PhoneCall` icon
**After:** Leads uses `UserCircle2`, Call Data uses `PhoneCall`

### Improvement 9 — Warn coordinators with no cities assigned

**Where:** `AddUserModal.jsx`
**Before:** A coordinator could be saved with zero cities. They would
log in and see no leads, with no indication why.
**After:** Confirmation prompt appears asking "Continue anyway?" if
trying to save a coordinator/support user with empty cities array.
Status dropdown also added (Active/Inactive) when editing.

---

## What I LEFT alone (intentionally)

These are minor or are v3 design choices that aren't actually bugs:

- **STANDARDS list mismatch.** Manual entry has just numbers ("7").
  Form sends combined ("Class 7 CBSE"). These display side by side
  inconsistently. Could harmonize later by parsing or by listing
  combined options. For now it's just visual.

- **No URL routing.** v3 uses `useState('dashboard')` for page state.
  Refresh resets to Dashboard, back button doesn't work, can't bookmark.
  This is the v3 architecture; changing it means rewriting App.jsx and
  every page. Out of scope for an audit pass.

- **`entryDate` defaults to UTC date.** In IST late at night the default
  date is yesterday. Manager can always pick the correct date manually.
  Edge case.

- **Token in `sessionStorage`.** Logs out when last tab closes. More
  secure than localStorage (no persistence across browser restarts).
  v3's choice — and arguably the right one for a CRM with sensitive
  data. Left as-is.

- **`AddUserModal` race on double-click.** A user can theoretically
  double-click Save before the disabled state kicks in. Backend's
  unique email constraint catches this — second click sees error.
  Not worth more code to prevent.

- **Dashboard's `recentLeads` shows last 5 by array order, not date.**
  Since the API returns leads sorted by `created_at DESC`, this is
  effectively "most recent 5". Works fine. Not a bug.

---

## Files changed in this audit (summary)

### Frontend (`protutor-crm-frontend/`)
- `src/lib/api.js` — added 401 handler, added `users.update` and `users.delete`
- `src/components/Sidebar.jsx` — fixed duplicate icon
- `src/components/modals/AddUserModal.jsx` — rewritten for add+edit, status field, city warning
- `src/components/modals/LeadFormModal.jsx` — added editable Online Location field
- `src/pages/UsersPage.jsx` — wired Edit and Delete, self-protection labels

### Backend (`backend-patch/`)
- `lib/auth.js` (`mapLead`) — exposes 16 new fields
- `api/users/index.js` — adds PUT and DELETE via `?id=` query param
- `api/leads/index.js` — POST accepts new form fields
- `api/leads/[id]/index.js` — PUT accepts new form fields

### Build verification
- Frontend production build: succeeds, 196 KB JS (58 KB gzipped)
- All backend JS files pass `node --check` syntax validation
