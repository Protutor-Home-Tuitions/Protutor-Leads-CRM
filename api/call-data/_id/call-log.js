import { supabase } from '../../../lib/supabase.js'
import { requireAuth, mapCallData } from '../../../lib/auth.js'

const CORS = {
  'Access-Control-Allow-Origin':  process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
  })
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const body = await parseBody(req)
  const id = req.query.id

  if (!id) return res.status(400).json({ error: 'Call data ID missing' })

  const { status, notes, followupDate, isOpen } = body

  if (!status) return res.status(400).json({ error: 'status is required' })

  const { data: existing, error: countErr } = await supabase
    .from('call_logs')
    .select('n')
    .eq('calldata_id', id)
    .order('n', { ascending: false })
    .limit(1)

  if (countErr) return res.status(500).json({ error: 'Count error: ' + countErr.message })

  const n = existing?.length > 0 ? existing[0].n + 1 : 1

  const { error: logError } = await supabase
    .from('call_logs')
    .insert({
      lead_id:        null,
      calldata_id:    id,
      n,
      status,
      notes:          notes || '',
      called_by_name: user.fname || '',
      is_open:        isOpen === true || isOpen === 'true',
      followup_date:  followupDate || null,
    })

  if (logError) return res.status(500).json({ error: 'Insert error: ' + logError.message })

  const { error: cdError } = await supabase
    .from('call_data')
    .update({
      status:        (isOpen === true || isOpen === 'true') ? 'open' : 'closed',
      followup_date: followupDate || null,
    })
    .eq('id', id)

  if (cdError) return res.status(500).json({ error: 'Call data update error: ' + cdError.message })

  const { data, error } = await supabase
    .from('call_data')
    .select('*, call_logs(*)')
    .eq('id', id)
    .single()

  if (error) return res.status(500).json({ error: 'Fetch error: ' + error.message })
  return res.json({ item: mapCallData(data) })
}
