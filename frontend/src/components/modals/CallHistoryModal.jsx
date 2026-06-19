import { Modal, ModalBtn } from '../ui/Modal';
import { formatDate, formatTime12hr } from '../../lib/utils';

export function CallHistoryModal({ open, onClose, item, type }) {
  const displayName = item ? (type === 'lead' ? item.parentName || item.mobile : item.name || item.phone) : '';
  const phone = item ? (type === 'lead' ? item.mobile : item.phone) : '';
  const logs = item ? [...(item.callLogs || [])].reverse() : [];

  return (
    <Modal open={open} onClose={onClose} width="480px"
      title={`Call History — ${displayName} (${phone})`}
      subtitle={`${item?.callLogs?.length || 0} call${(item?.callLogs?.length || 0) === 1 ? '' : 's'} logged`}
      footer={<ModalBtn variant="secondary" onClick={onClose}>Close</ModalBtn>}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {logs.length ? logs.map((log) => (
          <div key={log.n} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            {/* Header: Call number + Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#374151' }}>{log.n}</div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Call #{log.n}</span>
              </div>
              <span style={{
                display: 'inline-flex', padding: '3px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                background: log.isOpen ? '#fff7ed' : '#f3f4f6', color: log.isOpen ? '#ea580c' : '#6b7280',
                border: log.isOpen ? '1px solid #fed7aa' : '1px solid #e5e7eb',
              }}>{log.status}</span>
            </div>

            {/* Call details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#6b7280' }}>
              <div>📅 Logged: {formatDate(log.time)}{formatTime12hr(log.time) ? ' at ' + formatTime12hr(log.time) : ''}</div>
              <div>👤 Called by: {log.calledBy}</div>

              {/* Follow-up date/time — only show when present */}
              {log.followupDate && (
                <div style={{ marginTop: '4px', padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#92400e', fontWeight: 500 }}>
                  📆 Follow-up: {formatDate(log.followupDate)}{formatTime12hr(log.followupDate) ? ' at ' + formatTime12hr(log.followupDate) : ''}
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#374151', background: '#f8fafc', borderRadius: '6px', padding: '8px 10px' }}>
                  💬 {log.notes}
                </div>
              )}
            </div>
          </div>
        )) : <p style={{ textAlign: 'center', fontSize: '14px', color: '#9ca3af', padding: '32px 0' }}>No call logs yet</p>}
      </div>
    </Modal>
  );
}
