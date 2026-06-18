import { User, Phone, MapPin, BookOpen, Info, Calendar, Pen, Hash } from 'lucide-react';
import { Modal, ModalBtn } from '../ui/Modal';
import { formatDate } from '../../lib/utils';

function DetailField({ label, value, icon: Icon }) {
  const empty = !value || value === '—' || value === 'N/A';
  return (
    <div style={{ marginBottom: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
        {Icon && <Icon size={11} />}{label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: empty ? 400 : 500, color: empty ? '#d1d5db' : '#111827', fontStyle: empty ? 'italic' : 'normal' }}>{value || '—'}</div>
    </div>
  );
}

export function ViewDetailsModal({ open, onClose, item, type, onEdit }) {
  if (!item) return null;
  const isLead = type === 'lead';
  const phoneNum = isLead ? item.mobile : item.phone;
  const lastLog = item.callLogs?.length ? item.callLogs[item.callLogs.length - 1] : null;
  const closureReason = (item.status === 'closed' && lastLog?.status) || 'N/A';
  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', padding: '0 0 14px', borderBottom: '1px solid #f3f4f6', marginBottom: '14px' };
  const row3 = { ...row, gridTemplateColumns: '1fr 1fr 1fr' };

  return (
    <Modal open={open} onClose={onClose} width="600px"
      footer={<ModalBtn variant="secondary" onClick={onClose}>Close</ModalBtn>}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={18} color="#64748b" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{isLead ? 'Lead' : 'Number'} Details — {phoneNum}</span>
            <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
              background: item.status === 'open' ? '#fff7ed' : '#f3f4f6', color: item.status === 'open' ? '#ea580c' : '#6b7280',
              border: item.status === 'open' ? '1px solid #fed7aa' : '1px solid #e5e7eb' }}>{item.status === 'open' ? 'Open' : 'Closed'}</span>
            <button type="button" onClick={() => { onClose(); onEdit(item); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#374151', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>
              <Pen size={12} /> Edit
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Detailed information</div>
        </div>
      </div>
      {isLead ? (<>
        <div style={row}><DetailField icon={Phone} label="Phone" value={item.mobile} /><DetailField icon={MapPin} label="Location" value={[item.locality, item.city].filter(Boolean).join(', ')} /></div>
        <div style={row}><DetailField icon={BookOpen} label="Academics" value={[item.standard, item.subjects].filter(Boolean).join(', ')} /><DetailField icon={Info} label="Source" value={item.source} /></div>
        <div style={row}><DetailField icon={Calendar} label="Entry Date" value={formatDate(item.entryDate)} /><DetailField icon={Info} label="Closure Reason" value={closureReason} /></div>
        <div style={row3}><DetailField label="Email" value={item.email} /><DetailField label="Tutor Gender" value={item.tutorGender || 'Any'} /><DetailField label="Importance" value={item.importance} /></div>
        <div style={{...row3, borderBottom: 'none'}}><DetailField label="Notes" value={item.notes} /><DetailField label="Status" value={item.status === 'closed' ? closureReason : 'Open'} /><DetailField icon={User} label="Added By" value={item.addedBy} /></div>
      </>) : (<>
        <div style={row}><DetailField icon={Phone} label="Phone" value={item.phone} /><DetailField icon={MapPin} label="City" value={item.city} /></div>
        <div style={row}><DetailField icon={Hash} label="Category" value={item.category} /><DetailField icon={Info} label="Source" value={item.source} /></div>
        <div style={{...row, borderBottom: 'none'}}><DetailField label="Status" value={item.status === 'closed' ? closureReason : 'Open'} /><DetailField icon={User} label="Added By" value={item.addedBy || '—'} /></div>
      </>)}
    </Modal>
  );
}
