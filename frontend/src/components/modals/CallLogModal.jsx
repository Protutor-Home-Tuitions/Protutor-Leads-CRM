import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Textarea, Label } from '../ui/Input';
import { PhoneCall } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  STATUSES_OPEN_PART1,
  STATUSES_OPEN_PART2,
  STATUSES_CLOSED,
  STATUSES_NEEDS_FOLLOWUP,
} from '../../lib/constants';

export function CallLogModal({ open, onClose, item, type, onSave }) {
  const [selected, setSelected] = useState(null);
  const [statusType, setStatusType] = useState(null);
  const [notes, setNotes] = useState('');
  const [followupDate, setFollowupDate] = useState('');

  function reset() {
    setSelected(null);
    setStatusType(null);
    setNotes('');
    setFollowupDate('');
    onClose();
  }

  function save() {
    if (!selected) return;
    onSave({ status: selected, type: statusType, notes, followupDate });
    reset();
  }

  const displayName = item ? (type === 'lead' ? item.parentName || item.mobile : item.name || item.phone) : '';
  const callNumber = item ? (item.callLogs?.length || 0) + 1 : 1;
  const needsFollowup = STATUSES_NEEDS_FOLLOWUP.includes(selected);

  const pill = (label, openOrClosed) => (
    <button
      key={label}
      onClick={() => {
        setSelected(label);
        setStatusType(openOrClosed);
      }}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
        selected === label && openOrClosed === 'open'
          ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
          : selected === label && openOrClosed === 'closed'
          ? 'bg-slate-200 border-slate-500 text-slate-900 font-semibold'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
              <PhoneCall className="w-3.5 h-3.5 text-green-600" />
            </div>
            Quick Call Log
          </DialogTitle>
          <DialogDescription>
            Log your call for <strong>{displayName}</strong>. Call #{callNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <div className="mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                Open Status
              </span>
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">Part 1</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STATUSES_OPEN_PART1.map((s) => pill(s, 'open'))}
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">
              Part 2 — sets follow-up date
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES_OPEN_PART2.map((s) => pill(s, 'open'))}
            </div>
          </div>

          {needsFollowup && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
              <Label className="text-amber-700 text-xs">📅 Next Follow-up Date & Time</Label>
              <input
                type="datetime-local"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-amber-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          )}

          <div>
            <div className="mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                Closed Status
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">{STATUSES_CLOSED.map((s) => pill(s, 'closed'))}</div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add call notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={reset}>Cancel</Button>
          <Button onClick={save} disabled={!selected}>Save Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
