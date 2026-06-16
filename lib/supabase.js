import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

// The Supabase URL and service-role key now come ONLY from environment
// variables (via config.js). The previous hardcoded fallback values have
// been removed — they were live credentials and must never live in source.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
