import { createClient } from '@supabase/supabase-js'

// Single shared Supabase client used by all API routes
// Uses service_role key — bypasses Row Level Security
// NEVER expose this key to the browser
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
