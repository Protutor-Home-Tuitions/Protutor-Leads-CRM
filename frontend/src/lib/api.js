// All API calls go through this module. Token lives in sessionStorage as `crm_token`.
// Backend is at the same domain; relative URLs only.

const TOKEN_KEY = 'crm_token';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Called on 401 — App.jsx subscribes via window event so it can flip back to the login screen.
function emitUnauthorized() {
  window.dispatchEvent(new CustomEvent('crm:unauthorized'));
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    emitUnauthorized();
    throw new Error('Unauthorized');
  }

  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  }

  if (!res.ok) {
    const message = body?.error || body?.message || `Request failed: ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// ---- Auth ----
export async function login(email, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) setToken(data.token);
  return data; // { token, user }
}

export function logout() {
  clearToken();
}

// ---- Leads ----
export async function fetchLeads() {
  const data = await request('/api/leads');
  return data?.leads || [];
}

export async function createLead(payload) {
  const data = await request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data?.lead;
}

export async function updateLead(id, payload) {
  const data = await request(`/api/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data?.lead;
}

export async function toggleLeadStar(id, starred) {
  return request(`/api/leads/${id}/star`, {
    method: 'POST',
    body: JSON.stringify({ starred }),
  });
}

export async function addLeadCallLog(id, { status, type, notes, followupDate }) {
  return request(`/api/leads/${id}/call-log`, {
    method: 'POST',
    body: JSON.stringify({ status, isOpen: type === 'open', notes, followupDate }),
  });
}

export async function bumpLeadMsg(id, msgCount) {
  return request(`/api/leads/${id}/msg`, {
    method: 'POST',
    body: JSON.stringify({ msgCount }),
  });
}

// ---- Call Data ----
export async function fetchCallData() {
  const data = await request('/api/call-data');
  return data?.numbers || [];
}

export async function createNumber(payload) {
  const data = await request('/api/call-data', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data?.number;
}

export async function updateNumber(id, payload) {
  const data = await request(`/api/call-data/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data?.number;
}

export async function addNumberCallLog(id, { status, type, notes, followupDate }) {
  return request(`/api/call-data/${id}/call-log`, {
    method: 'POST',
    body: JSON.stringify({ status, isOpen: type === 'open', notes, followupDate }),
  });
}

export async function bumpNumberMsg(id, msgCount) {
  return request(`/api/call-data/${id}/msg`, {
    method: 'POST',
    body: JSON.stringify({ msgCount }),
  });
}

// ---- Users ----
export async function fetchUsers() {
  const data = await request('/api/users');
  return data?.users || [];
}

export async function createUser(payload) {
  const data = await request('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data?.user;
}

export async function updateUser(id, payload) {
  // Password is optional on update — caller is responsible for omitting it when blank.
  const data = await request(`/api/users?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data?.user;
}

export async function deleteUser(id) {
  return request(`/api/users?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
