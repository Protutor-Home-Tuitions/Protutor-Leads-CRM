import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { BookOpen } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export function CallHistoryModal({ open, onClose, item, type }) {
  if (!item) return null;
  const displayName = type === 'lead' ? item.parentName || item.mobile : item.name || item.phone;
  const phone = type === 'lead' ? item.mobile : item.phone;
  const logs = [...(item.callLogs || [])].reverse();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-600" />
            Call History — {displayName} ({phone})
          </DialogTitle>
          <DialogDescription>
            {item.callLogs?.length || 0} call{(item.callLogs?.length || 0) === 1 ? '' : 's'} logged
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {logs.length ? (
            logs.map((log) => (
              <div
                key={log.n}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        background: '#f1f5f9',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#374151',
                      }}
                    >
                      {log.n}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      Call #{log.n}
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '2px 10px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: log.isOpen ? '#fff7ed' : '#f3f4f6',
                      color: log.isOpen ? '#ea580c' : '#6b7280',
                      border: log.isOpen ? '1px solid #fed7aa' : '1px solid #e5e7eb',
                    }}
                  >
                    {log.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '3px' }}>
                  📅 {formatDateTime(log.time)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: log.notes ? '6px' : 0 }}>
                  👤 Called by: {log.calledBy}
                </div>
                {log.notes && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#374151',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      padding: '6px 8px',
                    }}
                  >
                    💬 {log.notes}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-slate-400 py-8">No call logs yet</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
