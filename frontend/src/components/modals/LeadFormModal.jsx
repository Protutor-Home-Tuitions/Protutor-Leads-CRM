// src/components/modals/LeadFormModal.jsx
// Pixel-matched to old CRM's "Add New Lead" modal (Image 3).
// 3-column grid, exact field order, uppercase labels.
import { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import { Modal, Button, Input, Select, Textarea } from '../ui'
import { CITIES, LEAD_SOURCES, CLASS_MODES, TUTOR_GENDERS, IMPORTANCE_LEVELS, BRAND } from '../../lib/constants'

const EMPTY = {
  parentName: '', studentName: '', mobile: '', countryCode: '91',
  city: '', locality: '', standard: '', subjects: '',
  source: '', email: '', tutorGender: '', importance: '',
  classMode: '', notes: '', entryDate: new Date().toISOString().split('T')[0],
  onlineLocation: '',
}

// Read-only form-capture fields (shown at bottom when editing form-submitted leads)
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

  const formDataPresent = lead && FORM_FIELDS.some(f => lead[f.key])

  return (
    <Modal open={open} onClose={onClose} title="" width="680px">
      {/* Header matching old CRM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px', background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserPlus size={18} color={BRAND.accent} />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: BRAND.textMain }}>
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </div>
          <div style={{ fontSize: '12px', color: BRAND.textMuted }}>
            Fill in the lead details below
          </div>
        </div>
      </div>

      {/* 3-column grid matching Image 3 exactly */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '16px' }}>
        {/* Row 1 */}
        <Input label="PARENT NAME" value={form.parentName} onChange={set('parentName')} placeholder="Full name" />
        <Input label="STUDENT NAME" value={form.studentName} onChange={set('studentName')} placeholder="Student's name" />
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textSub, display: 'block', marginBottom: '4px', letterSpacing: '0.03em' }}>
            MOBILE*
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              value={form.countryCode}
              onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
              style={{
                width: '44px', border: `1px solid ${BRAND.border}`, borderRadius: '8px',
                padding: '8px 6px', fontSize: '13px', textAlign: 'center', outline: 'none',
              }}
            />
            <input
              value={form.mobile}
              onChange={set('mobile')}
              placeholder="Phone number"
              type="tel"
              style={{
                flex: 1, border: `1px solid ${BRAND.border}`, borderRadius: '8px',
                padding: '8px 12px', fontSize: '13px', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Row 2 */}
        <Input label="STANDARD" value={form.standard} onChange={set('standard')} placeholder="e.g. Class 7" />
        <Input label="SUBJECTS" value={form.subjects} onChange={set('subjects')} placeholder="e.g. Maths, Science" />
        <Input label="ENTRY DATE*" value={form.entryDate} onChange={set('entryDate')} type="date" />

        {/* Row 3 */}
        <Select label="CITY*" value={form.city} onChange={set('city')} options={CITIES} placeholder="Select city" />
        <Input label="LOCALITY" value={form.locality} onChange={set('locality')} placeholder="Area / Neighborhood" />
        <Select label="SOURCE*" value={form.source} onChange={set('source')} options={LEAD_SOURCES} placeholder="Select source" />

        {/* Online location — appears when city is Online */}
        {form.city === 'Online' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="ONLINE LOCATION"
              value={form.onlineLocation}
              onChange={set('onlineLocation')}
              placeholder="Where is the parent located? (Dubai, London, Pune, etc.)"
            />
          </div>
        )}

        {/* Row 4 */}
        <Input label="EMAIL" value={form.email} onChange={set('email')} placeholder="example@email.com" type="email" />
        <Select label="TUTOR GENDER" value={form.tutorGender} onChange={set('tutorGender')} options={TUTOR_GENDERS} placeholder="Any" />

        {/* Row 5 */}
        <Select label="IMPORTANCE" value={form.importance} onChange={set('importance')} options={IMPORTANCE_LEVELS} placeholder="Select" />
        <Select label="CLASS MODE" value={form.classMode} onChange={set('classMode')} options={CLASS_MODES} placeholder="Any" />
      </div>

      {/* Notes — full width */}
      <div style={{ marginTop: '14px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textSub, display: 'block', marginBottom: '4px', letterSpacing: '0.03em' }}>
          NOTES
        </label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          placeholder="Additional notes..."
          rows={3}
          style={{
            width: '100%', border: `1px solid ${BRAND.border}`, borderRadius: '8px',
            padding: '10px 12px', fontSize: '13px', resize: 'vertical',
            outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            color: BRAND.textMain,
          }}
        />
      </div>

      {/* Read-only form data section */}
      {formDataPresent && (
        <div style={{
          marginTop: '16px', padding: '14px 16px', borderRadius: '8px',
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
                     style={{ color: '#2563eb', textDecoration: 'underline' }}>
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

      {/* Action buttons — matching old CRM style */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <Button variant="secondary" onClick={onClose}>✕ Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : lead ? '✓ Update Lead' : '✓ Save Lead'}
        </Button>
      </div>
    </Modal>
  )
}
