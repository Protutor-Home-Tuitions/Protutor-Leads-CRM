import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://baddtkhuvgymwqmetoxg.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZGR0a2h1dmd5bXdxbWV0b3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4NTQxNSwiZXhwIjoyMDkwMzYxNDE1fQ.QSznISHx2Jr-fHRlAA4DD1GTo51GIZlMt_9OHCMvBoQ'

export const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
