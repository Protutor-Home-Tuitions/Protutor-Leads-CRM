import { supabase } from '../../lib/supabase.js'
import { requireAuth, requireRole } from '../../lib/auth.js'
import { setCors, parseBody, handledPreflight } from '../../lib/http.js'

// Users endpoint — list, create, update, delete.
// We use `?id=<uuid>` as a query param to handle the per-user operations
// instead of /api/users/[id]/index.js so we stay under the 12-function
// Vercel Hobby plan limit.
//
// All operations require manager role.

export default async function handler(req, res) {
  setCors(req, res, 'GET, POST, PUT, DELETE')
  if (handledPreflight(req, res)) return

  const user = requireAuth(req, res)
  if (!user) return
  if (!requireRole(res, user, 'manager')) return

  // ── GET /api/users ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, fname, lname, email, mobile, role, status, cities, created_at')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ users: data })
  }

  // ── POST /api/users ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const b = await parseBody(req)
    if (!b.email || !b.password || !b.fname) {
      return res.status(400).json({ error: 'fname, email and password are required' })
    }
    if (b.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Hash password using Supabase RPC (pgcrypto bcrypt).
    const { data: hash, error: hashErr } = await supabase
      .rpc('hash_password', { p_password: b.password })
    if (hashErr) return res.status(500).json({ error: hashErr.message })

    const { data, error } = await supabase
      .from('users')
      .insert({
        fname:         b.fname,
        lname:         b.lname  || '',
        email:         b.email.toLowerCase().trim(),
        mobile:        b.mobile,
        password_hash: hash,
        role:          b.role   || 'coordinator',
        status:        b.status || 'Active',
        cities:        b.cities || [],
      })
      .select('id, fname, lname, email, mobile, role, status, cities')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ user: data })
  }

  // ── PUT /api/users?id=<uuid> ───────────────────────────────────────
  // Updates everything except password unless `password` is provided.
  // A manager cannot demote themselves (avoid lockout).
  if (req.method === 'PUT') {
    const id = req.query.id
    if (!id) return res.status(400).json({ error: 'user id is required (?id=...)' })

    const b = await parseBody(req)

    // Self-protection: managers can't change their own role or status.
    if (id === user.id && (b.role !== undefined && b.role !== user.role)) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }
    if (id === user.id && b.status && b.status !== 'Active') {
      return res.status(400).json({ error: 'Cannot deactivate yourself' })
    }

    const update = {
      fname:  b.fname  ?? undefined,
      lname:  b.lname  ?? undefined,
      email:  b.email ? b.email.toLowerCase().trim() : undefined,
      mobile: b.mobile ?? undefined,
      role:   b.role   ?? undefined,
      status: b.status ?? undefined,
      cities: b.cities ?? undefined,
    }

    // Strip undefined so we only update fields that were actually passed.
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k])

    // Optional password update — enforce minimum length.
    if (b.password && b.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    if (b.password) {
      const { data: hash, error: hashErr } = await supabase
        .rpc('hash_password', { p_password: b.password })
      if (hashErr) return res.status(500).json({ error: hashErr.message })
      update.password_hash = hash
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select('id, fname, lname, email, mobile, role, status, cities')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'User not found' })
    return res.json({ user: data })
  }

  // ── DELETE /api/users?id=<uuid> ────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = req.query.id
    if (!id) return res.status(400).json({ error: 'user id is required (?id=...)' })

    // Self-protection: managers can't delete themselves.
    if (id === user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }

    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
