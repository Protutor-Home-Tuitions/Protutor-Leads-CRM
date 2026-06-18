import { useState, useEffect } from 'react';
import { Modal, ModalBtn } from '../ui/Modal';
import { PhoneInput } from '../PhoneInput';
import { CITIES, SOURCES, EMPTY_NUMBER } from '../../lib/constants';
import { today } from '../../lib/utils';

export function AddNumberModal({ open, onClose, onSave, editItem }) {
  const [form, setForm] = useState({ ...EMPTY_NUMBER, entryDate: today() });

  useEffect(() => {
    setForm(editItem ? { ...EMPTY_NUMBER, ...editItem } : { ...EMPTY_NUMBER, entryDate: today() });
  }, [editItem, open]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const inp = { marginTop: '4px', width: '100%', height: '36px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' };
  const lbl = { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' };

  function submit() { if (!form.phone) return alert('Phone number required'); onSave(form); onClose(); }

  return (
    <Modal open={open} onClose={onClose} width="560px"
      title={editItem ? 'Edit Number' : 'Add Number'} subtitle="Track this phone number in call data"
      footer={<><ModalBtn variant="secondary" onClick={onClose}>✕ Cancel</ModalBtn><ModalBtn onClick={submit}>{editItem ? '✓ Save' : '✓ Add Number'}</ModalBtn></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>Phone Number *</label>
            <div style={{ marginTop: '4px' }}>
              <PhoneInput codeValue={form.countryCode || '91'} phoneValue={form.phone || ''}
                onCodeChange={v => setField('countryCode', v)} onPhoneChange={v => setField('phone', v)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Name</label>
            <input value={form.name || ''} onChange={e => setField('name', e.target.value)} placeholder="Full name" style={inp} />
          </div>
          <div>
            <label style={lbl}>City</label>
            <select value={form.city || ''} onChange={e => setField('city', e.target.value)} style={inp}>
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>Category</label>
            <select value={form.category || ''} onChange={e => setField('category', e.target.value)} style={inp}>
              <option value="">Select</option>
              <option value="Client">Client</option>
              <option value="Tutor">Tutor</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Source</label>
            <select value={form.source || ''} onChange={e => setField('source', e.target.value)} style={inp}>
              <option value="">Select source</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Entry Date</label>
            <input type="date" value={form.entryDate || ''} onChange={e => setField('entryDate', e.target.value)} style={inp} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
