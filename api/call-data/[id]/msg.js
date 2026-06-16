import { supabase } from '../../../lib/supabase.js'
import { requireAuth, mapCallData } from '../../../lib/auth.js'
import { setCors, handledPreflight } from '../../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'PATCH')
  if (handledPreflight(req, res)) return
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const id = req.query.id
  const { data: cur } = await supabase.from('call_data').select('msg_count').eq('id', id).single()
  const { data, error } = await supabase
    .from('call_data')
    .update({ msg_count: (cur?.msg_count || 0) + 1 })
    .eq('id', id)
    .select('*, call_logs(*)')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ number: mapCallData(data) })
}
