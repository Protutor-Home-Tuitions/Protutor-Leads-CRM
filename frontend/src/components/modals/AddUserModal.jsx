import { useState } from 'react';
import { X } from 'lucide-react';
import { CITIES_FOR_USERS } from '../../lib/constants';

const EMPTY = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  role: 'coordinator',
  status: 'Active',
  cities: [],
};

export function AddUserModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);

  if (!open) return null;

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const toggleCity = (c) =>
    setField('cities', form.cities.includes(c) ? form.cities.filter((x) => x !== c) : [...form.cities, c]);

  function submit() {
    if (!form.name || !form.email || !form.mobile || !form.password) {
      return alert('All fields are required');
    }
    if (form.cities.length === 0) {
      return alert('Select at least one city');
    }
    onSave(form);
    setForm(EMPTY);
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
      }}>
        <button type="button" onClick={onClose}
          style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', color: '#9ca3af' }}>
          <X size={16} />
        </button>

        <div style={{ padding: '20px 24px 12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>Add Employee</h2>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Add a new team member with role and city access</p>
        </div>

        <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Name (First) *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="First name"
                style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Mobile *</label>
              <input value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="Mobile number"
                style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="email@protutor.in"
                style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Password *</label>
              <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Set password"
                style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status *</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Role *</label>
              <select value={form.role} onChange={(e) => setField('role', e.target.value)}
                style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                <option value="manager">Manager</option>
                <option value="coordinator">Coordinator</option>
                <option value="support">Support</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cities Allotted *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {CITIES_FOR_USERS.map((c) => (
                <button key={c} type="button" onClick={() => toggleCity(c)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    border: form.cities.includes(c) ? '1.5px solid #16a34a' : '1.5px solid #d1d5db',
                    background: form.cities.includes(c) ? '#f0fdf4' : '#fff',
                    color: form.cities.includes(c) ? '#16a34a' : '#6b7280',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose}
            style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={submit}
            style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: 'none', background: '#16a34a', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
            Add Employee
          </button>
        </div>
      </div>
    </div>
  );
}
