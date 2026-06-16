import { supabase } from '../../../lib/supabase.js'
import { requireAuth, requireRole, mapLead, assertCanAccessLead } from '../../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../../lib/http.js'

export default async function handler(req, res) {
  setCors(req, res, 'PATCH')
  if (handledPreflight(req, res)) return
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return
  if (!requireRole(res, user, 'manager', 'coordinator')) return
  if ((await assertCanAccessLead(res, user, req.query.id)) === null) return

  const body = await parseBody(req)
  const { data, error } = await supabase
    .from('leads')
    .update({ starred: body.starred })
    .eq('id', req.query.id)
    .select('*, call_logs(*)')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ lead: mapLead(data) })
}
