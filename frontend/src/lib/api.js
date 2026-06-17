// ─────────────────────────────────────────────────────────────────────────────
// src/lib/api.js
// Single place for every API call. To change a URL or add a field, edit here.
// ─────────────────────────────────────────────────────────────────────────────

const getToken = () => sessionStorage.getItem('crm_token')

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, { headers: authHeaders(), ...options })

  // 401 = token expired / invalid. Clear session and force re-login.
  // Without this, the user gets stuck seeing alerts until they manually
  // refresh the page.
  if (res.status === 401) {
    sessionStorage.removeItem('crm_token')
    sessionStorage.removeItem('crm_user')
    // Soft reload — AuthProvider will pick up the null user and show login.
    window.location.reload()
    throw new Error('Session expired')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),
}

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leads = {
  list: () => request('/api/leads'),

  create: (lead) =>
    request('/api/leads', { method: 'POST', body: JSON.stringify(lead) }),

  update: (id, lead) =>
    request(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(lead) }),

  delete: (id) =>
    request(`/api/leads/${id}`, { method: 'DELETE' }),

  star: (id, starred) =>
    request(`/api/leads/${id}/star`, {
      method: 'PATCH',
      body: JSON.stringify({ starred }),
    }),

  logCall: (id, { status, type, notes, followupDate }) =>
    request(`/api/leads/${id}/call-log`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        notes,
        followupDate: followupDate || '',
        isOpen: type === 'open',
      }),
    }),

  sendMsg: (id) =>
    request(`/api/leads/${id}/msg`, { method: 'PATCH' }),
}

// ── Call Data ─────────────────────────────────────────────────────────────────
export const callData = {
  list: () => request('/api/call-data'),

  create: (item) =>
    request('/api/call-data', { method: 'POST', body: JSON.stringify(item) }),

  update: (id, item) =>
    request(`/api/call-data/${id}`, { method: 'PUT', body: JSON.stringify(item) }),

  delete: (id) =>
    request(`/api/call-data/${id}`, { method: 'DELETE' }),

  logCall: (id, { status, type, notes, followupDate }) =>
    request(`/api/call-data/${id}/call-log`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        notes,
        followupDate: followupDate || '',
        isOpen: type === 'open',
      }),
    }),

  sendMsg: (id) =>
    request(`/api/call-data/${id}/msg`, { method: 'PATCH' }),
}

// ── Users ─────────────────────────────────────────────────────────────────────
// Updates and deletes are routed through `?id=<uuid>` on the same endpoint
// because the backend is on Vercel's 12-function Hobby plan limit.
export const users = {
  list: () => request('/api/users'),

  create: (user) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(user) }),

  update: (id, user) =>
    request(`/api/users?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    }),

  delete: (id) =>
    request(`/api/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
