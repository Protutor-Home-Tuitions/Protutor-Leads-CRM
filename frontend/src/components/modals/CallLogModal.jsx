import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { Modal, ModalBtn } from '../ui/Modal';
import {
  STATUSES_OPEN_PART1,
  STATUSES_OPEN_PART2,
  STATUSES_CLOSED,
  STATUSES_NEEDS_FOLLOWUP,
} from '../../lib/constants';

export function CallLogModal({ open, onClose, item, type, onSave }) {
  const [selected, setSelected] = useState(null);
  const [statusType, setStatusType] = useState(null);
  const [notes, setNotes] = useState('');
  const [followupDate, setFollowupDate] = useState('');

  function reset() { setSelected(null); setStatusType(null); setNotes(''); setFollowupDate(''); onClose(); }
  function save() { if (!selected) return; onSave({ status: selected, type: statusType, notes, followupDate }); reset(); }

  const displayName = item ? (type === 'lead' ? item.parentName || item.mobile : item.name || item.phone) : '';
  const callNumber = item ? (item.callLogs?.length || 0) + 1 : 1;
  const needsFollowup = STATUSES_NEEDS_FOLLOWUP.includes(selected);

  const pill = (label, oc) => (
    <button key={label} type="button" onClick={() => { setSelected(label); setStatusType(oc); }}
      style={{
        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
        border: selected === label ? (oc === 'open' ? '1.5px solid #3b82f6' : '1.5px solid #64748b') : '1.5px solid #d1d5db',
        background: selected === label ? (oc === 'open' ? '#eff6ff' : '#e2e8f0') : '#fff',
        color: selected === label ? (oc === 'open' ? '#1d4ed8' : '#1e293b') : '#6b7280',
      }}>
      {label}
    </button>
  );

  return (
    <Modal open={open} onClose={reset} width="520px"
      footer={<><ModalBtn variant="secondary" onClick={reset}>Cancel</ModalBtn><ModalBtn onClick={save}>Save Log</ModalBtn></>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PhoneCall size={15} color="#16a34a" />
        </div>
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>Quick Call Log</span>
      </div>
      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
        Log your call for <strong style={{ color: '#111827' }}>{displayName}</strong>. Call #{callNumber}.
      </p>

      <div style={{ marginBottom: '12px' }}>
        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Open Status</span>
        <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Part 1</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>{STATUSES_OPEN_PART1.map(s => pill(s, 'open'))}</div>
        <p style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>Part 2 — sets follow-up date</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{STATUSES_OPEN_PART2.map(s => pill(s, 'open'))}</div>
      </div>

      {needsFollowup && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>📅 Next Follow-up Date & Time</label>
          <input type="datetime-local" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
            style={{ marginTop: '4px', width: '100%', height: '36px', border: '1px solid #fde68a', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Closed Status</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{STATUSES_CLOSED.map(s => pill(s, 'closed'))}</div>
      </div>

      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add call notes here..." rows={3}
          style={{ marginTop: '4px', width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
    </Modal>
  );
}
