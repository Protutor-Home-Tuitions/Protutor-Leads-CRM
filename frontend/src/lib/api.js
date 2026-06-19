// All API calls go through this module. Token lives in localStorage for persistence across refresh/close.
// Backend is at the same domain; relative URLs only.

const TOKEN_KEY = 'crm_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Check if JWT token is expired (decode without verification - just check exp)
export function isTokenExpired() {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // JWT exp is in seconds
    return Date.now() > expiry;
  } catch {
    return true; // malformed token = expired
  }
}

export function checkMonthlySignout() {
  const loginMonth = localStorage.getItem('crm_login_month');
  const today = new Date();
  // On the 1st of any month, if they logged in during a previous month, force signout
  if (today.getDate() === 1 && loginMonth !== null && parseInt(loginMonth) !== today.getMonth()) {
    clearToken();
    return true; // was signed out
  }
  return false;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('crm_login_month');
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
export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  let body = null;
  try { body = await res.json(); } catch {}

  if (!res.ok) {
    // If error is empty string = user not found → throw with empty message (silent)
    // If error has text = wrong password → throw with that message
    const msg = body?.error || '';
    throw new Error(msg);
  }

  if (body?.token) {
    localStorage.setItem('crm_token', body.token);
    localStorage.setItem('crm_login_month', new Date().getMonth().toString());
  }
  return body;
}

export function logout() {
  clearToken();
}

// ---- Leads ----
export async function fetchLeads(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await request('/api/leads' + (qs ? '?' + qs : ''));
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
    method: 'PATCH',
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
export async function fetchCallData(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await request('/api/call-data' + (qs ? '?' + qs : ''));
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

export async function deleteLead(id) {
  return request(`/api/leads/${id}`, { method: 'DELETE' });
}

export async function deleteNumber(id) {
  return request(`/api/call-data/${id}`, { method: 'DELETE' });
}
