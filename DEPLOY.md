# Path A Deployment — Audited & Fixed

This is the **audited** version that addresses 7 bugs/gaps found in the
initial v3 delivery. See AUDIT-NOTES.md for the full list.

## What's in this package

- **`protutor-crm-frontend/`** — the new componentized CRM frontend
  - All v3 base + audit fixes (working Edit/Delete user, editable
    onlineLocation, 401 auto-logout, distinct sidebar icons, etc.)
- **`backend-patch/`** — 4 files that replace files in your existing
  backend repo
  - `auth.js` → replaces `lib/auth.js`
  - `users-index.js` → replaces `api/users/index.js`
  - `leads-index.js` → replaces `api/leads/index.js`
  - `leads-id-index.js` → replaces `api/leads/[id]/index.js`

## ⚠️ Important

The original v3 zip contained an outdated backend. **Do not use that
backend.** Only use the 4 files in `backend-patch/` to patch your live
backend at `leads.protutor.co.in`.

---

## STEP 1 — Apply backend patches (3 minutes)

Open your existing CRM repo:
```
C:\Users\palla\Videos\Protutor all\Protutor-Leads-CRM
```

Replace these 4 files (rename as you copy):

| Replace this file | With this one from backend-patch/ |
|---|---|
| `lib/auth.js`                  | `auth.js` |
| `api/users/index.js`           | `users-index.js` (rename to `index.js`) |
| `api/leads/index.js`           | `leads-index.js` (rename to `index.js`) |
| `api/leads/[id]/index.js`      | `leads-id-index.js` (rename to `index.js`) |

Then commit and push:
```
cd C:\Users\palla\Videos\Protutor all\Protutor-Leads-CRM
git add .
git commit -m "Backend: user CRUD, lead form fields, mapLead extras"
git push
```

Vercel auto-deploys (~30s).

## STEP 2 — Deploy the new frontend (5 minutes)

1. Create a new private GitHub repo named `protutor-crm-frontend`
2. Extract `protutor-crm-frontend/` from this package to a new folder
3. Push:
   ```
   cd <extracted-folder>
   git init
   git add .
   git commit -m "Initial CRM frontend v2 (audited)"
   git branch -M main
   git remote add origin https://github.com/Protutor-Home-Tuitions/protutor-crm-frontend.git
   git push -u origin main
   ```
4. In Vercel: **New Project → Import → Vite preset → Deploy**

## STEP 3 — Test everything (15 minutes)

Open the new Vercel URL and verify each fix:

### Critical fixes
- [ ] **Login** — log in as a manager
- [ ] **Edit user** — click Edit on any user row → modal opens pre-filled → change something → Save → row updates
- [ ] **Delete user** — click Delete on a non-self row → confirms → row disappears
- [ ] **Self-protection** — your own row shows "(you)" label, NO delete button shown
- [ ] **Online city** — Add User modal has "Online" in the cities pills
- [ ] **Manual Online lead** — click Add Lead, pick city "Online", an extra "Online Location" field appears below the grid → fill it in → save → shows up in leads list as `📍 Online · <typed location>`
- [ ] **Form data visible** — open any form-submitted lead in edit mode → "Form Data" section appears at bottom with country/fees/quote/etc.
- [ ] **Auto-logout on session expire** — wait until token expires (8h) or manually delete `crm_token` from sessionStorage in DevTools → next API call kicks you back to login

### Visual fixes
- [ ] Sidebar: Leads icon ≠ Call Data icon (different shapes now)
- [ ] "Online" appears in Leads filter dropdown
- [ ] CLASS_MODES dropdown shows Online / Offline / Any (not Home Tuition / Center)

### Smoke test
- [ ] Add a lead manually → appears in list
- [ ] Star a lead → toggles
- [ ] Log a call → call count increases
- [ ] Filter by status open/closed → works

## STEP 4 — Switch your CRM domain (only when confident)

In Vercel → frontend project → Settings → Domains → add `crm.protutor.co.in`
(or whatever your CRM domain is) → update DNS.

---

## What was fixed in this audit pass

### Critical
1. **Edit user button** was visible but did nothing → now opens modal in edit mode with pre-filled data, saves changes
2. **Delete user** didn't exist → now works with self-protection (can't delete yourself)
3. **Backend had no PUT/DELETE for users** → added (routed via `?id=` to stay at 12 functions)
4. **Manual entry of Online leads** couldn't capture parent's location → added editable `onlineLocation` field that appears when city='Online'
5. **Backend POST/PUT for leads** silently dropped new form fields → now accepts all 12 form-capture fields so managers can edit them
6. **mapLead** didn't return new fields to the frontend → now returns all 16 new fields

### Serious
7. **401 auth handler** missing → API client now clears session and reloads on 401, taking user back to login instead of getting stuck

### Polish
8. **Sidebar icons** were identical for Leads and Call Data → now distinct (UserCircle2 vs PhoneCall)
9. **Coordinator without cities** could be silently saved (would see no leads) → confirmation dialog warns

## What's still NOT fixed (intentional)

- **STANDARDS list mismatch** — manual entry saves "7", form sends "Class 7 CBSE". Different display. Not a bug, just visual inconsistency. Future polish.
- **No URL routing** — refreshing resets to Dashboard. v3 design choice.
- **Date timezone** — `entryDate` uses UTC date, can be off by one day in IST late at night. Edge case.
- **Token in sessionStorage** — logs out on tab close. v3's choice (more secure than localStorage).
