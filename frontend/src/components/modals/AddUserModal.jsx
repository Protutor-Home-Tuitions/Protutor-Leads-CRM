// src/components/modals/AddUserModal.jsx
// Add + Edit employee modal. When `editingUser` is provided, the form
// pre-fills with that user's data and password becomes optional
// (blank = leave password unchanged).
import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from '../ui'
import { CITIES, ROLES, BRAND } from '../../lib/constants'

const EMPTY = {
  fname: '', lname: '', email: '', mobile: '',
  password: '', role: 'coordinator', status: 'Active', cities: [],
}

export default function AddUserModal({ open, onClose, onSave, editingUser }) {
  const isEdit = !!editingUser
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // Re-populate form whenever the user we're editing changes.
  useEffect(() => {
    if (editingUser) {
      setForm({
        fname:    editingUser.fname || '',
        lname:    editingUser.lname || '',
        email:    editingUser.email || '',
        mobile:   editingUser.mobile || '',
        password: '',  // blank means "don't change"
        role:     editingUser.role || 'coordinator',
        status:   editingUser.status || 'Active',
        cities:   Array.isArray(editingUser.cities) ? [...editingUser.cities] : [],
      })
    } else {
      setForm(EMPTY)
    }
  }, [editingUser, open])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  function toggleCity(city) {
    setForm(f => ({
      ...f,
      cities: f.cities.includes(city)
        ? f.cities.filter(c => c !== city)
        : [...f.cities, city],
    }))
  }

  async function handleSave() {
    if (!form.fname || !form.email) {
      alert('First name and email are required')
      return
    }
    if (!isEdit && !form.password) {
      alert('Password is required for new users')
      return
    }
    // Soft warning: a coordinator with no cities sees zero leads.
    if ((form.role === 'coordinator' || form.role === 'support') && form.cities.length === 0) {
      const ok = confirm(
        `This ${form.role} has no cities assigned and won't see any leads. Continue anyway?`
      )
      if (!ok) return
    }
    setSaving(true)
    try {
      // For edits, only send password if the manager actually entered one.
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password
      await onSave(payload)
      if (!isEdit) setForm(EMPTY)
      onClose()
    } catch (err) {
      alert((isEdit ? 'Failed to update: ' : 'Failed to add: ') + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="First Name *" value={form.fname} onChange={set('fname')} placeholder="First name" />
          <Input label="Last Name"   value={form.lname} onChange={set('lname')} placeholder="Last name" />
          <Input label="Email *"     value={form.email} onChange={set('email')} placeholder="email@protutor.in" type="email" />
          <Input label="Mobile"      value={form.mobile} onChange={set('mobile')} placeholder="9876543210" type="tel" />
          <Input
            label={isEdit ? 'New Password (optional)' : 'Password *'}
            value={form.password}
            onChange={set('password')}
            placeholder={isEdit ? 'Leave blank to keep current' : 'Temporary password'}
            type="password"
          />
          <Select label="Role" value={form.role} onChange={set('role')} options={ROLES} />
          {isEdit && (
            <Select
              label="Status"
              value={form.status}
              onChange={set('status')}
              options={['Active', 'Inactive']}
            />
          )}
        </div>

        {/* Cities multi-select */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub, display: 'block', marginBottom: '6px' }}>
            Assigned Cities
            {(form.role === 'coordinator' || form.role === 'support') && form.cities.length === 0 && (
              <span style={{ color: BRAND.warning, marginLeft: '8px', fontWeight: 500 }}>
                — none selected, this user won't see any leads
              </span>
            )}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CITIES.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                  fontWeight: 500, cursor: 'pointer', border: '1px solid',
                  borderColor: form.cities.includes(city) ? BRAND.accent : BRAND.border,
                  background: form.cities.includes(city) ? '#f0fdf4' : '#fff',
                  color: form.cities.includes(city) ? '#15803d' : BRAND.textSub,
                }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Employee')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
