import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { PhoneInput, FormField } from '../PhoneInput';
import { CITIES, SOURCES, EMPTY_NUMBER } from '../../lib/constants';
import { today } from '../../lib/utils';

export function AddNumberModal({ open, onClose, onSave, editItem }) {
  const [form, setForm] = useState({ ...EMPTY_NUMBER, entryDate: today() });

  useEffect(() => {
    setForm(editItem ? { ...EMPTY_NUMBER, ...editItem } : { ...EMPTY_NUMBER, entryDate: today() });
  }, [editItem, open]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!form.phone) return alert('Phone number required');
    onSave(form);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Number' : 'Add Number'}</DialogTitle>
          <DialogDescription>Track this phone number in call data</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Phone Number*">
              <PhoneInput
                codeValue={form.countryCode || '91'}
                phoneValue={form.phone || ''}
                onCodeChange={(v) => setField('countryCode', v)}
                onPhoneChange={(v) => setField('phone', v)}
                phonePlaceholder="Phone number"
              />
            </FormField>
            <FormField label="Name">
              <Input
                placeholder="Full name"
                value={form.name || ''}
                onChange={(e) => setField('name', e.target.value)}
              />
            </FormField>
            <FormField label="City">
              <Select value={form.city || ''} onValueChange={(v) => setField('city', v)}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Category">
              <Select value={form.category || ''} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Tutor">Tutor</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Source">
              <Select value={form.source || ''} onValueChange={(v) => setField('source', v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Entry Date">
              <Input
                type="date"
                value={form.entryDate || ''}
                onChange={(e) => setField('entryDate', e.target.value)}
              />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>✕ Cancel</Button>
          <Button onClick={submit}>{editItem ? '✓ Save' : '✓ Add Number'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
