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
import { FormField } from '../PhoneInput';
import { CITIES_FOR_USERS } from '../../lib/constants';

const EMPTY = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  role: 'coordinator',
  status: 'Active',
  cities: [],
};

export function EditUserModal({ open, onClose, onSave, user }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        password: '', // Always blank — leave empty to keep existing password
        role: user.role || 'coordinator',
        status: user.status || 'Active',
        cities: user.cities || [],
      });
    } else {
      setForm(EMPTY);
    }
  }, [user, open]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const toggleCity = (c) =>
    setField('cities', form.cities.includes(c) ? form.cities.filter((x) => x !== c) : [...form.cities, c]);

  function submit() {
    if (!form.name || !form.email || !form.mobile) {
      return alert('Name, email, and mobile are required');
    }
    // Password is optional on update — omit when blank so backend keeps the existing one.
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    onSave(payload);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update team member details and access</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name (First)" req>
              <Input placeholder="First name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </FormField>
            <FormField label="Mobile" req>
              <Input placeholder="Mobile number" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email" req>
              <Input type="email" placeholder="email@protutor.in" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </FormField>
            <FormField label="Password">
              <Input
                type="password"
                placeholder="Leave blank to keep existing"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status" req>
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Role" req>
              <Select value={form.role} onValueChange={(v) => setField('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Cities Allotted" req>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CITIES_FOR_USERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCity(c)}
                  className={`px-3 py-1 rounded-full text-xs border cursor-pointer transition-all ${
                    form.cities.includes(c)
                      ? 'bg-green-50 border-green-500 text-green-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
