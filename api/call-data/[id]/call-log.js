import { supabase } from '../../../lib/supabase.js'
import { requireAuth, mapCallData } from '../../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'POST')
  if (handledPreflight(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const id = req.query.id
  if (!id) return res.status(400).json({ error: 'Call data ID missing' })

  const body = await parseBody(req)
  const { status, notes, followupDate, isOpen } = body
  if (!status) return res.status(400).json({ error: 'status is required' })

  const open = isOpen === true || isOpen === 'true'

  const { error: rpcError } = await supabase.rpc('add_call_log', {
    p_lead_id:       null,
    p_calldata_id:   id,
    p_status:        status,
    p_notes:         notes || '',
    p_user_id:       user.id,
    p_user_name:     user.fname || '',
    p_is_open:       open,
    p_followup_date: followupDate || null,
  })
  if (rpcError) return res.status(500).json({ error: 'Insert error: ' + rpcError.message })

  const { data, error } = await supabase
    .from('call_data').select('*, call_logs(*)').eq('id', id).single()
  if (error) return res.status(500).json({ error: 'Fetch error: ' + error.message })
  return res.json({ item: mapCallData(data) })
}
