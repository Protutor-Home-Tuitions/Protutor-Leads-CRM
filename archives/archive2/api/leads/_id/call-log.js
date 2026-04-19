import { supabase } from '../../../lib/supabase.js'
import { requireAuth, mapLead } from '../../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const id = req.query.id
  const { status, notes, followupDate, isOpen } = req.body

  // Get current call count to set n
  const { data: existing } = await supabase
    .from('call_logs')
    .select('n')
    .eq('lead_id', id)
    .order('n', { ascending: false })
    .limit(1)

  const n = existing?.length > 0 ? existing[0].n + 1 : 1

  // Insert call log
  const { error: logError } = await supabase.from('call_logs').insert({
    lead_id:        id,
    n,
    status,
    notes:          notes || '',
    called_by_name: user.fname,
    is_open:        isOpen,
    followup_date:  followupDate || null,
  })
  if (logError) return res.status(500).json({ error: logError.message })

  // Update lead status and followup date
  const { error: leadError } = await supabase
    .from('leads')
    .update({
      status:        isOpen ? 'open' : 'closed',
      followup_date: followupDate || null,
    })
    .eq('id', id)
  if (leadError) return res.status(500).json({ error: leadError.message })

  // Return full updated lead
  const { data, error } = await supabase
    .from('leads')
    .select(`*, call_logs(*)`)
    .eq('id', id)
    .single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ lead: mapLead(data) })
}
