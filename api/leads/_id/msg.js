import { supabase } from '../../../lib/supabase.js'
import { requireAuth, mapLead } from '../../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  // Increment msg_count by 1 using Supabase RPC or raw SQL
  const { data, error } = await supabase
    .from('leads')
    .update({ msg_count: supabase.sql`msg_count + 1` })
    .eq('id', req.query.id)
    .select(`*, call_logs(*)`)
    .single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ lead: mapLead(data) })
}
