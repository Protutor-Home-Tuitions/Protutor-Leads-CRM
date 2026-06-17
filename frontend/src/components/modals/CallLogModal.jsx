// src/components/modals/CallLogModal.jsx
// Pixel-matched to the old CRM's "Quick Call Log" modal (Image 9).
// Uses chip-based status selection grouped into Open/Part2/Closed.
import { useState } from 'react'
import { Phone } from 'lucide-react'
import { Modal, Button, Textarea } from '../ui'
import {
  CALL_STATUS_OPEN_P1, CALL_STATUS_OPEN_P2, CALL_STATUS_CLOSED,
  OPEN_STATUSES, BRAND,
} from '../../lib/constants'

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
        fontWeight: 500, cursor: 'pointer',
        border: `1.5px solid ${selected ? BRAND.accent : '#d1d5db'}`,
        background: selected ? '#f0fdf4' : '#fff',
        color: selected ? BRAND.accent : BRAND.textSub,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function SectionLabel({ text, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em',
      background: color === 'blue' ? '#eff6ff' : '#f0fdf4',
      color: color === 'blue' ? '#2563eb' : '#16a34a',
      border: `1px solid ${color === 'blue' ? '#bfdbfe' : '#bbf7d0'}`,
      marginBottom: '8px',
    }}>
      {text}
    </span>
  )
}

export default function CallLogModal({ open, onClose, item, type, onSave, currentUser }) {
  const [status, setStatus]             = useState('')
  const [notes, setNotes]               = useState('')
  const [followupDate, setFollowupDate] = useState('')
  const [saving, setSaving]             = useState(false)

  const name = type === 'lead'
    ? (item?.parentName || item?.mobile)
    : (item?.name || item?.phone)

  const callNumber = (item?.callLogs?.length || 0) + 1

  const isOpen = OPEN_STATUSES.includes(status)
  const needsFollowup = CALL_STATUS_OPEN_P2.includes(status)

  async function handleSave() {
    if (!status) return
    setSaving(true)
    try {
      await onSave({
        status,
        type: isOpen ? 'open' : 'closed',
        notes,
        followupDate: needsFollowup ? followupDate : '',
      })
      setStatus('')
      setNotes('')
      setFollowupDate('')
      onClose()
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="" width="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px', background: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Phone size={18} color={BRAND.accent} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: BRAND.textMain }}>
                Quick Call Log
              </div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: BRAND.textSub, marginTop: '6px' }}>
            Log your call for <strong style={{ color: BRAND.textMain }}>{name}</strong>.
            Call #{callNumber}.
          </div>
        </div>

        {/* OPEN STATUS section */}
        <div>
          <SectionLabel text="OPEN STATUS" color="blue" />

          <div style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textMuted, marginBottom: '6px', letterSpacing: '0.03em' }}>
            PART 1
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {CALL_STATUS_OPEN_P1.map(s => (
              <Chip key={s} label={s} selected={status === s} onClick={() => setStatus(s)} />
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: BRAND.accent, marginBottom: '6px', letterSpacing: '0.03em' }}>
            PART 2 — SETS FOLLOW-UP DATE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CALL_STATUS_OPEN_P2.map(s => (
              <Chip key={s} label={s} selected={status === s} onClick={() => setStatus(s)} />
            ))}
          </div>
        </div>

        {/* Follow-up date — only shown when a Part 2 status is selected */}
        {needsFollowup && (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub, display: 'block', marginBottom: '4px' }}>
              Follow-up Date
            </label>
            <input
              type="date"
              value={followupDate}
              onChange={e => setFollowupDate(e.target.value)}
              style={{
                border: `1px solid ${BRAND.border}`, borderRadius: '8px',
                padding: '8px 12px', fontSize: '13px', width: '100%',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
        )}

        {/* CLOSED STATUS section */}
        <div>
          <SectionLabel text="CLOSED STATUS" color="green" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CALL_STATUS_CLOSED.map(s => (
              <Chip key={s} label={s} selected={status === s} onClick={() => setStatus(s)} />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: BRAND.textSub, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            NOTES
          </label>
          <textarea
            placeholder="Add call notes here..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{
              border: `1px solid ${BRAND.border}`, borderRadius: '8px',
              padding: '10px 12px', fontSize: '13px', resize: 'vertical',
              outline: 'none', width: '100%', boxSizing: 'border-box',
              color: BRAND.textMain, fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!status || saving}>
            {saving ? 'Saving...' : 'Save Log'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
