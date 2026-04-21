# ProTutor CRM — Frontend Config

The frontend does NOT use a .env file at runtime because it is
compiled to static HTML/CSS/JS files. Config values are set
BEFORE building, directly in the source files.

---

## 1. Backend API URL → src/lib/api.js

```js
// Line 14 in src/lib/api.js
export const API_BASE_URL = 'http://localhost:4000'    // development
export const API_BASE_URL = 'https://api.protutor.in'  // production
```

---

## 2. Integration URLs → src/lib/integrations.js

```js
export const CLIENT_CHECK_URL         = 'https://api.protutor.in/crm/check-clients'
export const TUTOR_CHECK_URL          = 'https://api.protutor.in/crm/check-tutors'
export const NEW_LEADS_SYNC_URL       = 'https://api.protutor.in/crm/new-leads'

export const WATI_API_URL             = 'https://live-server-XXXXX.wati.io'
export const WATI_API_TOKEN           = 'your_wati_bearer_token'
export const WATI_TEMPLATE_CALL_LOG   = 'call_log_template'
export const WATI_TEMPLATE_NEW_NUMBER = 'new_number_template'
```

---

## 3. After editing, rebuild

```bash
cd protutor-crm
npm run build
```

Then copy the new dist/assets/*.js and dist/assets/*.css to your output files.

---

## NOTE: WATI_API_TOKEN in frontend

The WATI token is embedded in the JS bundle. For production,
move WATI calls to your backend instead so the token is never
visible in browser source code.
