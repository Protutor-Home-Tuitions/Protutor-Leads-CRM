// Supabase client for missed calls dashboard
// Uses anon key (read-only access via RLS policies)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://baddtkhuvgymwqmetoxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZGR0a2h1dmd5bXdxbWV0b3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODU0MTUsImV4cCI6MjA5MDM2MTQxNX0._RflfwGMYuqahmRrLZzGutu_2X4dU6jzBS6bJ3RhmOc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
