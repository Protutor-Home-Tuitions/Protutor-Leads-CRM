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
import { Input, Textarea } from '../ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { PhoneInput, FormField } from '../PhoneInput';
import { UserPlus } from 'lucide-react';
import { CITIES, SOURCES, CLASS_MODES, EMPTY_LEAD } from '../../lib/constants';
import { today } from '../../lib/utils';

export function LeadFormModal({ open, onClose, onSave, editLead }) {
  const [form, setForm] = useState({ ...EMPTY_LEAD, entryDate: today() });

  useEffect(() => {
    setForm(editLead ? { ...EMPTY_LEAD, ...editLead } : { ...EMPTY_LEAD, entryDate: today() });
  }, [editLead, open]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!form.mobile) return alert('Mobile is required');
    if (!form.city) return alert('City is required');
    if (!form.source) return alert('Source is required');
    onSave(form);
    onClose();
  }

  // Feature 3 — Form Data section: only show fields that have a value
  const fd = editLead || {};
  const formFields = [
    { key: 'country', label: 'Country' },
    { key: 'locationAddress', label: 'Location Address' },
    { key: 'mapsLink', label: 'Maps Link', isLink: true },
    { key: 'daysPerWeek', label: 'Days per Week' },
    { key: 'hoursPerSession', label: 'Hours per Session' },
    { key: 'hourlyFee', label: 'Hourly Fee' },
    { key: 'monthlyEstimate', label: 'Monthly Estimate' },
    { key: 'quoteAccepted', label: 'Quote Accepted' },
    { key: 'expectedQuote', label: 'Expected Quote' },
    { key: 'dataQuality', label: 'Data Quality' },
    { key: 'requestId', label: 'Request ID' },
  ];
  const visibleFormFields = formFields.filter((f) => {
    const v = fd[f.key];
    return v !== null && v !== undefined && v !== '';
  });
  const hasFormData = visibleFormFields.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5 text-green-600" />
            </div>
            {editLead ? 'Edit Lead' : 'Add New Lead'}
          </DialogTitle>
          <DialogDescription>Fill in the lead details below</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Parent Name">
              <Input
                placeholder="Full name"
                value={form.parentName || ''}
                onChange={(e) => setField('parentName', e.target.value)}
              />
            </FormField>
            <FormField label="Student Name">
              <Input
                placeholder="Student's name"
                value={form.studentName || ''}
                onChange={(e) => setField('studentName', e.target.value)}
              />
            </FormField>
            <FormField label="Mobile*">
              <PhoneInput
                codeValue={form.countryCode || '91'}
                phoneValue={form.mobile || ''}
                onCodeChange={(v) => setField('countryCode', v)}
                onPhoneChange={(v) => setField('mobile', v)}
                phonePlaceholder="Phone number"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Standard">
              <Input
                placeholder="e.g. Class 7"
                value={form.standard || ''}
                onChange={(e) => setField('standard', e.target.value)}
              />
            </FormField>
            <FormField label="Subjects">
              <Input
                placeholder="e.g. Maths, Science"
                value={form.subjects || ''}
                onChange={(e) => setField('subjects', e.target.value)}
              />
            </FormField>
            <FormField label="Entry Date" req>
              <Input
                type="date"
                value={form.entryDate || ''}
                onChange={(e) => setField('entryDate', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="City" req>
              <Select value={form.city || ''} onValueChange={(v) => setField('city', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Locality">
              <Input
                placeholder="Area / Neighborhood"
                value={form.locality || ''}
                onChange={(e) => setField('locality', e.target.value)}
              />
            </FormField>
            <FormField label="Source" req>
              <Select value={form.source || ''} onValueChange={(v) => setField('source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Feature 1 — Online Location field, only visible when city === "Online" */}
          {form.city === 'Online' && (
            <FormField label="Online Location">
              <Input
                placeholder="e.g. Country, Region or Timezone"
                value={form.onlineLocation || ''}
                onChange={(e) => setField('onlineLocation', e.target.value)}
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input
                type="email"
                placeholder="example@email.com"
                value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
              />
            </FormField>
            <FormField label="Tutor Gender">
              <Select value={form.tutorGender || ''} onValueChange={(v) => setField('tutorGender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Importance">
              <Select value={form.importance || ''} onValueChange={(v) => setField('importance', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immediately">Immediately</SelectItem>
                  <SelectItem value="This month">This month</SelectItem>
                  <SelectItem value="Next month">Next month</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Class Mode">
              <Select value={form.classMode || ''} onValueChange={(v) => setField('classMode', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Notes">
            <Textarea
              placeholder="Additional notes..."
              value={form.notes || ''}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
            />
          </FormField>

          {/* Feature 3 — Form Data (read-only) */}
          {editLead && hasFormData && (
            <div className="mt-2 pt-4 border-t border-slate-200">
              <div className="mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-purple-600 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">
                  Form Data
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {visibleFormFields.map(({ key, label, isLink }) => {
                  const value = fd[key];
                  return (
                    <div key={key} className="space-y-0.5">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        {label}
                      </div>
                      <div className="text-sm text-slate-800 break-words">
                        {isLink ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {value}
                          </a>
                        ) : (
                          String(value)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>✕ Cancel</Button>
          <Button onClick={submit}>✓ Save Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
