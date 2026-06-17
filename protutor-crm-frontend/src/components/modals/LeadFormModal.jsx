// src/components/modals/LeadFormModal.jsx
import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from '../ui'
import { CITIES, LEAD_SOURCES, CLASS_MODES, TUTOR_GENDERS, IMPORTANCE_LEVELS, STANDARDS } from '../../lib/constants'
import { BRAND } from '../../lib/constants'

const EMPTY = {
  parentName: '', studentName: '', mobile: '', countryCode: '91',
  city: '', locality: '', standard: '', subjects: '',
  source: '', email: '', tutorGender: '', importance: '',
  classMode: '', notes: '', entryDate: new Date().toISOString().split('T')[0],
  onlineLocation: '',  // editable when city='Online' (parent's typed city)
}

// Fields the form captures that managers can't edit but should see.
// `onlineLocation` is intentionally NOT in this list because we now show it
// as an editable field above (when city='Online').
const FORM_FIELDS = [
  { key: 'country',          label: 'Country' },
  { key: 'locationAddress',  label: 'Location Address' },
  { key: 'mapsLink',         label: 'Maps Link', isLink: true },
  { key: 'daysPerWeek',      label: 'Days / Week' },
  { key: 'hoursPerSession',  label: 'Hours / Session' },
  { key: 'hourlyFee',        label: 'Hourly Fee' },
  { key: 'monthlyEstimate',  label: 'Monthly Estimate' },
  { key: 'quoteAccepted',    label: 'Quote Accepted' },
  { key: 'expectedQuote',    label: 'Expected Quote' },
  { key: 'dataQuality',      label: 'Data Quality' },
  { key: 'requestId',        label: 'Form Request ID' },
]

export default function LeadFormModal({ open, onClose, lead, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(lead ? { ...EMPTY, ...lead } : EMPTY)
  }, [lead, open])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave() {
    if (!form.mobile || !form.city || !form.source) {
      alert('Mobile, City, and Source are required')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Only render the Form Data block if the lead actually has some of those values.
  const formDataPresent = lead && FORM_FIELDS.some(f => lead[f.key])

  return (
    <Modal open={open} onClose={onClose} title={lead ? 'Edit Lead' : 'Add New Lead'} width="560px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input label="Parent Name" value={form.parentName} onChange={set('parentName')} placeholder="Parent name" />
        <Input label="Student Name" value={form.studentName} onChange={set('studentName')} placeholder="Student name" />
        <Input label="Mobile *" value={form.mobile} onChange={set('mobile')} placeholder="9876543210" type="tel" />
        <Input label="Email" value={form.email} onChange={set('email')} placeholder="email@example.com" type="email" />
        <Select label="City *" value={form.city} onChange={set('city')} options={CITIES} placeholder="Select city" />
        <Input label="Locality" value={form.locality} onChange={set('locality')} placeholder="Area / locality" />
        {form.city === 'Online' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Online Location"
              value={form.onlineLocation}
              onChange={set('onlineLocation')}
              placeholder="Where is the parent located? (Dubai, London, Pune, etc.)"
            />
          </div>
        )}
        <Select label="Standard" value={form.standard} onChange={set('standard')} options={STANDARDS} placeholder="Select standard" />
        <Input label="Subjects" value={form.subjects} onChange={set('subjects')} placeholder="Maths, Science..." />
        <Select label="Source *" value={form.source} onChange={set('source')} options={LEAD_SOURCES} placeholder="Select source" />
        <Input label="Entry Date" value={form.entryDate} onChange={set('entryDate')} type="date" />
        <Select label="Class Mode" value={form.classMode} onChange={set('classMode')} options={CLASS_MODES} placeholder="Select mode" />
        <Select label="Tutor Gender" value={form.tutorGender} onChange={set('tutorGender')} options={TUTOR_GENDERS} placeholder="No preference" />
        <Select label="Importance" value={form.importance} onChange={set('importance')} options={IMPORTANCE_LEVELS} placeholder="Select level" />
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
        </div>
      </div>

      {/* Read-only section for fields captured by the public intake form. */}
      {formDataPresent && (
        <div style={{
          marginTop: '20px', padding: '14px 16px', borderRadius: '8px',
          background: '#f8fafc', border: `1px solid ${BRAND.border}`,
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: BRAND.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px',
          }}>
            Form Data (submitted by parent — read-only)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {FORM_FIELDS.filter(f => lead[f.key]).map(f => (
              <div key={f.key} style={{ fontSize: '12px' }}>
                <span style={{ color: BRAND.textMuted }}>{f.label}: </span>
                {f.isLink ? (
                  <a href={lead[f.key]} target="_blank" rel="noreferrer"
                     style={{ color: BRAND.accent, textDecoration: 'underline' }}>
                    Open map
                  </a>
                ) : (
                  <span style={{ color: BRAND.textMain, fontWeight: 500 }}>{lead[f.key]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : lead ? 'Update Lead' : 'Add Lead'}</Button>
      </div>
    </Modal>
  )
}
