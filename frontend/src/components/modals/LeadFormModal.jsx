import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal, ModalBtn } from '../ui/Modal';
import { PhoneInput } from '../PhoneInput';
import { CITIES, SOURCES, CLASS_MODES, EMPTY_LEAD } from '../../lib/constants';
import { today } from '../../lib/utils';

export function LeadFormModal({ open, onClose, onSave, editLead }) {
  const [form, setForm] = useState({ ...EMPTY_LEAD, entryDate: today() });

  useEffect(() => {
    setForm(editLead ? { ...EMPTY_LEAD, ...editLead } : { ...EMPTY_LEAD, entryDate: today() });
  }, [editLead, open]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const inp = { marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const sel = { ...inp, background: '#fff' };
  const lbl = { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' };

  function submit() {
    if (!form.mobile) return alert('Mobile is required');
    if (!form.city) return alert('City is required');
    if (!form.source) return alert('Source is required');
    onSave(form); onClose();
  }

  const fd = editLead || {};
  const formFields = [
    { key: 'country', label: 'Country' }, { key: 'locationAddress', label: 'Location Address' },
    { key: 'mapsLink', label: 'Maps Link', isLink: true }, { key: 'daysPerWeek', label: 'Days per Week' },
    { key: 'hoursPerSession', label: 'Hours per Session' }, { key: 'hourlyFee', label: 'Hourly Fee' },
    { key: 'monthlyEstimate', label: 'Monthly Estimate' }, { key: 'quoteAccepted', label: 'Quote Accepted' },
    { key: 'expectedQuote', label: 'Expected Quote' }, { key: 'dataQuality', label: 'Data Quality' },
    { key: 'requestId', label: 'Request ID' },
  ];
  const visibleFormFields = formFields.filter(f => { const v = fd[f.key]; return v !== null && v !== undefined && v !== ''; });

  return (
    <Modal open={open} onClose={onClose} width="680px"
      footer={<><ModalBtn variant="secondary" onClick={onClose}>✕ Cancel</ModalBtn><ModalBtn onClick={submit}>✓ Save Lead</ModalBtn></>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserPlus size={15} color="#16a34a" />
        </div>
        <div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{editLead ? 'Edit Lead' : 'Add New Lead'}</span>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Fill in the lead details below</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>Parent Name</label><input value={form.parentName || ''} onChange={e => setField('parentName', e.target.value)} placeholder="Full name" style={inp} /></div>
          <div><label style={lbl}>Student Name</label><input value={form.studentName || ''} onChange={e => setField('studentName', e.target.value)} placeholder="Student's name" style={inp} /></div>
          <div><label style={lbl}>Mobile *</label><div style={{ marginTop: '4px' }}><PhoneInput codeValue={form.countryCode || '91'} phoneValue={form.mobile || ''} onCodeChange={v => setField('countryCode', v)} onPhoneChange={v => setField('mobile', v)} /></div></div>
        </div>
        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>Standard</label><input value={form.standard || ''} onChange={e => setField('standard', e.target.value)} placeholder="e.g. Class 7" style={inp} /></div>
          <div><label style={lbl}>Subjects</label><input value={form.subjects || ''} onChange={e => setField('subjects', e.target.value)} placeholder="e.g. Maths, Science" style={inp} /></div>
          <div><label style={lbl}>Entry Date *</label><input type="date" value={form.entryDate || ''} onChange={e => setField('entryDate', e.target.value)} style={inp} /></div>
        </div>
        {/* Row 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>City *</label><select value={form.city || ''} onChange={e => setField('city', e.target.value)} style={sel}><option value="">Select city</option>{CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Locality</label><input value={form.locality || ''} onChange={e => setField('locality', e.target.value)} placeholder="Area / Neighborhood" style={inp} /></div>
          <div><label style={lbl}>Source *</label><select value={form.source || ''} onChange={e => setField('source', e.target.value)} style={sel}><option value="">Select source</option>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        {/* Online Location */}
        {form.city === 'Online' && (
          <div><label style={lbl}>Online Location</label><input value={form.onlineLocation || ''} onChange={e => setField('onlineLocation', e.target.value)} placeholder="e.g. Country, Region or Timezone" style={inp} /></div>
        )}
        {/* Row 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>Email</label><input type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} placeholder="example@email.com" style={inp} /></div>
          <div><label style={lbl}>Tutor Gender</label><select value={form.tutorGender || ''} onChange={e => setField('tutorGender', e.target.value)} style={sel}><option value="">Any</option><option value="Any">Any</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
        </div>
        {/* Row 5 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>Importance</label><select value={form.importance || ''} onChange={e => setField('importance', e.target.value)} style={sel}><option value="">Select</option><option value="Immediately">Immediately</option><option value="This month">This month</option><option value="Next month">Next month</option></select></div>
          <div><label style={lbl}>Class Mode</label><select value={form.classMode || ''} onChange={e => setField('classMode', e.target.value)} style={sel}><option value="">Any</option>{CLASS_MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
        {/* Notes */}
        <div><label style={lbl}>Notes</label><textarea value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Additional notes..." rows={3} style={{ marginTop: '4px', width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} /></div>
        {/* Form Data */}
        {editLead && visibleFormFields.length > 0 && (
          <div style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '10px' }}>Form Data</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {visibleFormFields.map(({ key, label, isLink }) => (
                <div key={key}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: '#1e293b', wordBreak: 'break-word' }}>
                    {isLink ? <a href={fd[key]} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{fd[key]}</a> : String(fd[key])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
