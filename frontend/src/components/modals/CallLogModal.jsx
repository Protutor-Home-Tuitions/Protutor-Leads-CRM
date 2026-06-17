// src/components/modals/CallLogModal.jsx
import { useState } from 'react'
import { Modal, Button, Select, Textarea } from '../ui'
import { CALL_STATUSES, OPEN_STATUSES, BRAND } from '../../lib/constants'

export default function CallLogModal({ open, onClose, item, type, onSave, currentUser }) {
  const [status, setStatus]           = useState('')
  const [callType, setCallType]       = useState('open')
  const [notes, setNotes]             = useState('')
  const [followupDate, setFollowupDate] = useState('')
  const [saving, setSaving]           = useState(false)

  const name = type === 'lead'
    ? (item?.parentName || item?.mobile)
    : (item?.name || item?.phone)

  const callNumber = (item?.callLogs?.length || 0) + 1

  const isOpenStatus = OPEN_STATUSES.includes(status)

  async function handleSave() {
    if (!status) return
    setSaving(true)
    try {
      await onSave({ status, type: isOpenStatus ? 'open' : 'closed', notes, followupDate })
      // Reset form
      setStatus('')
      setCallType('open')
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
    <Modal open={open} onClose={onClose} title={`Log Call #${callNumber}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Who we're calling */}
        <div style={{
          background: '#f8fafc', borderRadius: '8px', padding: '10px 14px',
          fontSize: '13px', color: BRAND.textSub,
        }}>
          Logging call for <strong style={{ color: BRAND.textMain }}>{name}</strong>
          {currentUser && <> by <strong style={{ color: BRAND.textMain }}>{currentUser.fname}</strong></>}
        </div>

        <Select
          label="Call Status *"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="Select a status..."
          options={CALL_STATUSES}
        />

        {/* Open / Closed toggle */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub, display: 'block', marginBottom: '6px' }}>
            Lead Status After This Call
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['open', 'closed'].map(t => (
              <button
                key={t}
                onClick={() => setCallType(t)}
                style={{
                  flex: 1, padding: '7px', borderRadius: '8px', border: `1px solid`,
                  borderColor: callType === t ? BRAND.accent : BRAND.border,
                  background: callType === t ? '#f0fdf4' : '#fff',
                  color: callType === t ? BRAND.accent : BRAND.textSub,
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Notes"
          placeholder="What was discussed..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

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
