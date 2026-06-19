import { User, Phone, MapPin, BookOpen, Info, Calendar, Pen, Hash, Clock, Globe, CreditCard } from 'lucide-react';
import { Modal, ModalBtn } from '../ui/Modal';
import { formatDate, formatTime12hr } from '../../lib/utils';

function Field({ label, value, icon: Icon, isLink }) {
  const empty = !value || value === '—' || value === 'N/A';
  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
        {Icon && <Icon size={11} />}{label}
      </div>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 500, color: '#2563eb', textDecoration: 'underline' }}>Open Map</a>
      ) : (
        <div style={{ fontSize: '14px', fontWeight: empty ? 400 : 500, color: empty ? '#d1d5db' : '#111827', fontStyle: empty ? 'italic' : 'normal', wordBreak: 'break-word' }}>{value || '—'}</div>
      )}
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      {title && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: '4px',
            background: color === 'purple' ? '#faf5ff' : '#f8fafc',
            color: color === 'purple' ? '#7c3aed' : '#64748b',
            border: `1px solid ${color === 'purple' ? '#e9d5ff' : '#e2e8f0'}`,
          }}>{title}</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 20px' }}>
        {children}
      </div>
    </div>
  );
}

export function ViewDetailsModal({ open, onClose, item, type, onEdit }) {
  if (!item) return null;
  const isLead = type === 'lead';
  const phoneNum = isLead ? item.mobile : item.phone;
  const lastLog = item.callLogs?.length ? item.callLogs[item.callLogs.length - 1] : null;
  const closureReason = (item.status === 'closed' && lastLog?.status) || 'N/A';
  const callCount = item.callLogs?.length || 0;

  const hasFormData = isLead && (item.hourlyFee || item.monthlyEstimate || item.daysPerWeek || item.hoursPerSession || item.mapsLink || item.expectedQuote || item.country || item.locationAddress);

  return (
    <Modal open={open} onClose={onClose} width="650px"
      footer={<ModalBtn variant="secondary" onClick={onClose}>Close</ModalBtn>}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={18} color="#64748b" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{isLead ? 'Lead' : 'Number'} Details — {isLead ? (item.parentName || phoneNum) : (item.name || phoneNum)}</span>
            <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
              background: item.status === 'open' ? '#fff7ed' : '#f3f4f6', color: item.status === 'open' ? '#ea580c' : '#6b7280',
              border: item.status === 'open' ? '1px solid #fed7aa' : '1px solid #e5e7eb' }}>{item.status === 'open' ? 'Open' : 'Closed'}</span>
            {isLead && item.classMode && item.classMode !== 'Any' && (
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                background: item.classMode === 'Online' ? '#eff6ff' : '#f3f4f6',
                color: item.classMode === 'Online' ? '#2563eb' : '#6b7280' }}>{item.classMode}</span>
            )}
            <button type="button" onClick={() => { onClose(); onEdit(item); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#374151', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>
              <Pen size={12} /> Edit
            </button>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
        {isLead ? (
          <>
            {/* Contact & Location */}
            <Section title="Contact & Location">
              <Field icon={User} label="Parent Name" value={item.parentName} />
              <Field icon={User} label="Student Name" value={item.studentName} />
              <Field icon={Phone} label="Phone" value={`+${item.countryCode || '91'} ${item.mobile}`} />
              <Field icon={MapPin} label="City" value={item.city} />
              <Field icon={MapPin} label="Locality" value={item.locality} />
              {item.onlineLocation && <Field icon={Globe} label="Online Location" value={item.onlineLocation} />}
            </Section>

            {/* Academics */}
            <Section title="Academics & Preferences">
              <Field icon={BookOpen} label="Standard" value={item.standard} />
              <Field icon={BookOpen} label="Subjects" value={item.subjects} />
              <Field label="Class Mode" value={item.classMode} />
              <Field label="Tutor Gender" value={item.tutorGender || 'Any'} />
              <Field label="Importance" value={item.importance} />
              <Field label="Email" value={item.email} />
            </Section>

            {/* Status & Tracking */}
            <Section title="Status & Tracking">
              <Field icon={Info} label="Source" value={item.source} />
              <Field icon={Calendar} label="Entry Date" value={formatDate(item.entryDate)} />
              <Field icon={User} label="Added By" value={item.addedBy} />
              <Field label="Status" value={item.status === 'closed' ? closureReason : 'Open'} />
              <Field label="Calls Made" value={`${callCount} call${callCount !== 1 ? 's' : ''}`} />
              <Field icon={Clock} label="Follow-up" value={item.followupDate ? `${formatDate(item.followupDate)}${formatTime12hr(item.followupDate) ? ' at ' + formatTime12hr(item.followupDate) : ''}` : 'None'} />
              <Field label="Last Call Status" value={lastLog?.status} />
              <Field label="Notes" value={item.notes} />
              {item.status === 'closed' && <Field label="Closure Reason" value={closureReason} />}
            </Section>

            {/* Form Data */}
            {hasFormData && (
              <Section title="Form Data (submitted by parent)" color="purple">
                {item.country && <Field icon={Globe} label="Country" value={item.country} />}
                {item.locationAddress && <Field icon={MapPin} label="Location Address" value={item.locationAddress} />}
                {item.mapsLink && <Field icon={MapPin} label="Map Link" value={item.mapsLink} isLink />}
                {item.daysPerWeek && <Field label="Days per Week" value={item.daysPerWeek} />}
                {item.hoursPerSession && <Field label="Hours per Session" value={item.hoursPerSession} />}
                {item.hourlyFee && <Field icon={CreditCard} label="Hourly Fee" value={item.hourlyFee} />}
                {item.monthlyEstimate && <Field icon={CreditCard} label="Monthly Estimate" value={item.monthlyEstimate} />}
                {item.quoteAccepted !== undefined && item.quoteAccepted !== null && item.quoteAccepted !== '' && <Field label="Quote Accepted" value={String(item.quoteAccepted)} />}
                {item.expectedQuote && <Field label="Parent's Quote" value={item.expectedQuote} />}

              </Section>
            )}
          </>
        ) : (
          <>
            <Section title="Contact Info">
              <Field icon={Phone} label="Phone" value={`+${item.countryCode || '91'} ${item.phone}`} />
              <Field label="Name" value={item.name} />
              <Field icon={MapPin} label="City" value={item.city} />
              <Field icon={Hash} label="Category" value={item.category} />
              <Field icon={Info} label="Source" value={item.source} />
              <Field icon={Calendar} label="Entry Date" value={formatDate(item.entryDate)} />
            </Section>
            <Section title="Status">
              <Field label="Status" value={item.status === 'closed' ? closureReason : 'Open'} />
              <Field label="Calls Made" value={`${callCount} call${callCount !== 1 ? 's' : ''}`} />
              <Field icon={Clock} label="Follow-up" value={item.followupDate ? `${formatDate(item.followupDate)}${formatTime12hr(item.followupDate) ? ' at ' + formatTime12hr(item.followupDate) : ''}` : 'None'} />
              <Field icon={User} label="Added By" value={item.addedBy || '—'} />
            </Section>
          </>
        )}
      </div>
    </Modal>
  );
}
