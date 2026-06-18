import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { User, Phone, MapPin, BookOpen, Info, Calendar, Pen, Hash } from 'lucide-react';
import { formatDate } from '../../lib/utils';

function DetailField({ label, value, icon: Icon }) {
  const empty = !value || value === '—' || value === 'N/A';
  return (
    <div style={{ marginBottom: '2px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '3px',
        }}
      >
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: empty ? 400 : 500,
          color: empty ? '#d1d5db' : '#111827',
          fontStyle: empty ? 'italic' : 'normal',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export function ViewDetailsModal({ open, onClose, item, type, onEdit }) {
  if (!item) return null;
  const isLead = type === 'lead';
  const phoneNum = isLead ? item.mobile : item.phone;
  const lastLog =
    item.callLogs && item.callLogs.length
      ? item.callLogs[item.callLogs.length - 1]
      : null;
  const closureReason =
    (item.status === 'closed' && lastLog?.status) || 'N/A';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <User size={18} color="#64748b" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '3px',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                  {isLead ? 'Lead Details' : 'Number Details'} — {phoneNum}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    padding: '2px 10px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: item.status === 'open' ? '#fff7ed' : '#f3f4f6',
                    color: item.status === 'open' ? '#ea580c' : '#6b7280',
                    border:
                      item.status === 'open'
                        ? '1px solid #fed7aa'
                        : '1px solid #e5e7eb',
                  }}
                >
                  {item.status === 'open' ? 'Open' : 'Closed'}
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <Pen size={12} />
                  Edit
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                Detailed information for the {isLead ? 'lead' : 'number'}
              </div>
            </div>
          </div>
        </DialogHeader>
        <div style={{ padding: '4px 0 8px' }}>
          {isLead ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px 24px',
                  padding: '0 0 14px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '14px',
                }}
              >
                <DetailField icon={Phone} label="Phone Number" value={item.mobile} />
                <DetailField
                  icon={MapPin}
                  label="Location"
                  value={[item.locality, item.city].filter(Boolean).join(', ')}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px 24px',
                  padding: '0 0 14px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '14px',
                }}
              >
                <DetailField
                  icon={BookOpen}
                  label="Academics"
                  value={[item.standard, item.subjects].filter(Boolean).join(', ')}
                />
                <DetailField icon={Info} label="Source" value={item.source} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px 24px',
                  padding: '0 0 14px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '14px',
                }}
              >
                <DetailField icon={Calendar} label="Entry Date" value={formatDate(item.entryDate)} />
                <DetailField icon={Info} label="Closure Reason" value={closureReason} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '16px 24px',
                  padding: '0 0 14px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '14px',
                }}
              >
                <DetailField label="Email" value={item.email} />
                <DetailField label="Tutor Gender" value={item.tutorGender || 'Any'} />
                <DetailField label="Importance" value={item.importance} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px' }}>
                <DetailField label="Notes" value={item.notes} />
                <DetailField
                  label={item.status === 'closed' ? 'Closure Reason' : 'Lead Status'}
                  value={item.status === 'closed' ? closureReason : 'Open'}
                />
                <DetailField icon={User} label="Added By" value={item.addedBy} />
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px 24px',
                  padding: '0 0 14px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '14px',
                }}
              >
                <DetailField icon={Phone} label="Phone" value={item.phone} />
                <DetailField icon={MapPin} label="City" value={item.city} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px 24px',
                  padding: '0 0 14px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '14px',
                }}
              >
                <DetailField icon={Hash} label="Category" value={item.category} />
                <DetailField icon={Info} label="Source" value={item.source} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <DetailField
                  label="Lead Status / Closure"
                  value={item.status === 'closed' ? closureReason : 'Open'}
                />
                <DetailField icon={User} label="Added By" value={item.addedBy || '—'} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
