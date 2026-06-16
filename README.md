# ProTutor Leads CRM — Backend

Serverless API (Vercel functions) + Supabase Postgres for the ProTutor leads CRM.

## Setup

1. **Database** — In the Supabase SQL Editor, run in order:
   1. `supabase-setup-FULL.sql` (tables, functions, seed users)
   2. `supabase-migration-callogs.sql` (atomic call-log numbering)

2. **Environment** — Copy `.env.example` to `.env` and fill in real values.
   Set the same variables in your Vercel project settings for production.
   The app will refuse to start if any required secret is missing.

3. **Change the default passwords.** The seed users in the SQL script ship
   with the password `password`. Change them immediately after first login.

## Security notes

- All secrets come from environment variables only — there are no hardcoded
  fallbacks. If a secret was ever committed to Git history, rotate it in the
  Supabase dashboard (editing the file does not remove it from history).
- Set `ALLOWED_ORIGINS` to your real front-end origin in production.

## Roles

- **manager** — full access, including deletes and user management.
- **coordinator** — create/edit leads within their assigned cities.
- **support** — see only leads moved to support, within their cities.
