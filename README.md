# ProTutor CRM

Lead management system with a React frontend and Vercel serverless backend.

## Structure

```
api/           — Vercel serverless functions (12 endpoints)
lib/           — Shared backend utilities (auth, supabase, config, http)
frontend/      — React + Vite frontend (built by Vercel on deploy)
_disabled/     — Parked endpoints (backfill — move to api/ when needed)
```

## Env vars (set in Vercel dashboard)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `ADMIN_SECRET` (only needed when backfill endpoint is active)

## Deploy

Push to GitHub → Vercel auto-builds and deploys.
Vercel runs: `cd frontend && npm install && npm run build`
Static files from `frontend/dist/`, API from `api/`.
