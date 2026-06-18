import { BookOpen } from 'lucide-react';
import { Modal, ModalBtn } from '../ui/Modal';
import { formatDateTime } from '../../lib/utils';

export function CallHistoryModal({ open, onClose, item, type }) {
  if (!item) return null;
  const displayName = type === 'lead' ? item.parentName || item.mobile : item.name || item.phone;
  const phone = type === 'lead' ? item.mobile : item.phone;
  const logs = [...(item.callLogs || [])].reverse();

  return (
    <Modal open={open} onClose={onClose} width="440px"
      title={`Call History — ${displayName} (${phone})`}
      subtitle={`${item.callLogs?.length || 0} call${(item.callLogs?.length || 0) === 1 ? '' : 's'} logged`}
      footer={<ModalBtn variant="secondary" onClick={onClose}>Close</ModalBtn>}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {logs.length ? logs.map((log) => (
          <div key={log.n} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#374151' }}>{log.n}</div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Call #{log.n}</span>
              </div>
              <span style={{
                display: 'inline-flex', padding: '2px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                background: log.isOpen ? '#fff7ed' : '#f3f4f6', color: log.isOpen ? '#ea580c' : '#6b7280',
                border: log.isOpen ? '1px solid #fed7aa' : '1px solid #e5e7eb',
              }}>{log.status}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '3px' }}>📅 {formatDateTime(log.time)}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: log.notes ? '6px' : 0 }}>👤 Called by: {log.calledBy}</div>
            {log.notes && <div style={{ fontSize: '12px', color: '#374151', background: '#f8fafc', borderRadius: '6px', padding: '6px 8px' }}>💬 {log.notes}</div>}
          </div>
        )) : <p style={{ textAlign: 'center', fontSize: '14px', color: '#9ca3af', padding: '32px 0' }}>No call logs yet</p>}
      </div>
    </Modal>
  );
}
