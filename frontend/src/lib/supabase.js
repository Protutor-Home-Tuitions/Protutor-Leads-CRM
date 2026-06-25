// Supabase client for missed calls dashboard
// Uses anon key (read-only access via RLS policies)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://baddtkhuvgymwqmetoxg.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE'; // Get from Supabase → Settings → API → anon public

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
