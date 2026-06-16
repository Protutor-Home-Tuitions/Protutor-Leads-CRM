// ─────────────────────────────────────────────────────────────────────────
// Central configuration.
//
// All secrets and environment-specific values are read HERE, in one place.
// If a required value is missing, the app throws immediately on startup
// instead of silently falling back to an insecure default. This is on
// purpose: a deploy that is misconfigured should fail loudly and refuse to
// run, NOT run with a publicly-known secret.
// ─────────────────────────────────────────────────────────────────────────

// Reads a required environment variable. Throws a clear error if it's missing.
function required(name) {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in your hosting environment (e.g. Vercel project settings) ` +
      `or in a local .env file. See .env.example for the full list.`
    )
  }
  return value
}

// Reads an optional environment variable, using a fallback if it's absent.
// Only use this for NON-secret values (timeouts, expiry windows, etc.).
function optional(name, fallback) {
  const value = process.env[name]
  return value && value.trim() !== '' ? value : fallback
}

export const config = {
  supabaseUrl:        required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret:          required('JWT_SECRET'),
  jwtExpiresIn:       optional('JWT_EXPIRES_IN', '8h'),

  // Comma-separated list of allowed front-end origins, e.g.
  //   ALLOWED_ORIGINS=https://crm.protutor.in,https://www.protutor.in
  // Falls back to '*' ONLY if unset, so existing deploys don't break — but
  // you should set this to your real origin(s) in production.
  allowedOrigins: optional('ALLOWED_ORIGINS', '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}
