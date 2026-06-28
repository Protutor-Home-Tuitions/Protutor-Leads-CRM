import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/DropdownMenu';
import { AddNumberModal } from '../components/modals/AddNumberModal';
import { CallLogModal } from '../components/modals/CallLogModal';
import { CallHistoryModal } from '../components/modals/CallHistoryModal';
import { ViewDetailsModal } from '../components/modals/ViewDetailsModal';
import {
  MapPin,
  BookOpen,
  Info,
  PhoneCall,
  Search,
  Plus,
  Download,
  MessageCircle,
  EllipsisVertical,
} from 'lucide-react';
import {
  formatDate,
  formatTime12hr,
  isToday,
  digitsOnly,
  sendWhatsAppMissedCall,
  telLink,
} from '../lib/utils';
import { CITIES } from '../lib/constants';
import {
  createNumber,
  updateNumber,
  addNumberCallLog,
  deleteNumber,
  bumpNumberMsg,
} from '../lib/api';

export function CallDataPage({ callData, setCallData, currentUser, phoneStatusMap = new Map(), reloadCallData }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const [cityFilter, setCityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const [viewFor, setViewFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  const isManager = currentUser?.role === 'manager';

  // ---- Refetch from server when statusFilter or search changes ----
  // Skip the very first render (App.jsx already fetched with status=open).
  // When search has 3+ chars → server-side search across ALL records.
  // Otherwise → fetch by status filter as before.
  const isInitialMount = useRef(true);
  const debounceRef = useRef(null);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (typeof reloadCallData !== 'function') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (search.length >= 5) {
      // Server-side search all call data (debounced 400ms)
      debounceRef.current = setTimeout(() => {
        reloadCallData({ search });
      }, 400);
    } else {
      // No search or partial — fetch by status
      const params = statusFilter === 'all' ? {} : { status: statusFilter };
      reloadCallData(params);
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, statusFilter, reloadCallData]);

  const filtered = useMemo(() => {
    let list = callData;
    // Status filter is now applied server-side (see useEffect above)
    if (cityFilter !== 'all') list = list.filter((n) => n.city === cityFilter);
    if (categoryFilter !== 'all') list = list.filter((n) => n.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((n) => ((n.name || '') + (n.phone || '')).toLowerCase().includes(q));
    }
    list = list.sort((a, b) => {
      const dateA = new Date(a.entryDate || 0);
      const dateB = new Date(b.entryDate || 0);
      return dateB - dateA;
    });
    return list;
  }, [callData, cityFilter, categoryFilter, search]);

  const logForItem = logFor ? callData.find((n) => n.id === logFor) : null;
  const viewForItem = viewFor ? callData.find((n) => n.id === viewFor) : null;
  const historyForItem = historyFor ? callData.find((n) => n.id === historyFor) : null;

  const onDeleteNumber = useCallback(
    async (item) => {
      const name = item.name || item.phone;
      if (!confirm(`Delete "${name}"? This will permanently remove the number and all call logs. This cannot be undone.`)) return;
      try {
        await deleteNumber(item.id);
        setCallData((cur) => cur.filter((n) => n.id !== item.id));
      } catch (e) {
        alert('Failed to delete: ' + e.message);
      }
    },
    [setCallData]
  );

  const onLogCall = useCallback(
    async ({ status, type, notes, followupDate }) => {
      const id = logFor;
      if (!id) return;
      try {
        const result = await addNumberCallLog(id, { status, type, notes, followupDate });
        setCallData((cur) =>
          cur.map((n) => {
            if (n.id !== id) return n;
            const callLog = result?.callLog || {
              n: (n.callLogs?.length || 0) + 1,
              status, notes,
              time: new Date().toISOString().replace('T', ' ').slice(0, 16),
              calledBy: currentUser?.name || currentUser?.fname || 'User',
              isOpen: type === 'open',
            };
            return {
              ...n,
              callLogs: [...(n.callLogs || []), callLog],
              status: result?.numberStatus || (type === 'closed' ? 'closed' : 'open'),
              followupDate: followupDate || n.followupDate,
            };
          })
        );
      } catch (e) {
        alert('Failed to log call: ' + e.message);
      }
    },
    [logFor, setCallData, currentUser]
  );

  const onSaveForm = useCallback(
    async (form) => {
      try {
        if (editing) {
          const updated = await updateNumber(editing.id, form);
          setCallData((cur) => cur.map((n) => (n.id === editing.id ? { ...n, ...(updated || form) } : n)));
        } else {
          const created = await createNumber(form);
          if (created) {
            setCallData((cur) => [created, ...cur]);
          } else {
            setCallData((cur) => [
              {
                id: Date.now(),
                ...form,
                status: 'open',
                callLogs: [],
                followupDate: '',
                msgCount: 0,
                addedBy: currentUser?.name || currentUser?.fname || 'User',
              },
              ...cur,
            ]);
          }
        }
        setEditing(null);
      } catch (e) {
        alert('Failed to save number: ' + e.message);
      }
    },
    [editing, setCallData, currentUser]
  );

  const onWhatsApp = useCallback(
    async (n) => {
      sendWhatsAppMissedCall(n.phone, currentUser?.name || currentUser?.fname, n.countryCode);
      const newCount = (n.msgCount || 0) + 1;
      setCallData((cur) => cur.map((x) => (x.id === n.id ? { ...x, msgCount: newCount } : x)));
      try { await bumpNumberMsg(n.id, newCount); } catch {}
    },
    [setCallData, currentUser]
  );

  function exportCsv() {
    if (currentUser?.role !== 'manager') {
      alert('Export is only available for managers.');
      return;
    }
    const maxCalls = Math.max(0, ...filtered.map((n) => (n.callLogs?.length || 0)));
    const callCols = [];
    for (let n = 1; n <= maxCalls; n++) {
      callCols.push(
        `Call Log ${n} - Called By`,
        `Call Log ${n} - Date`,
        `Call Log ${n} - Time`,
        `Call Log ${n} - Status`,
        `Call Log ${n} - Notes`,
        `Call Log ${n} - Followup Date`
      );
    }
    const headers = [
      'Country Code', 'Phone Number', 'Name', 'City', 'Category', 'Source',
      'Entry Date', 'Number Status', 'Closure Reason', 'Closed Date',
      'DB Status (Client/Tutor)', 'Message Sent Times', 'Call Times', ...callCols,
    ];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((item) => {
      const logs = [...(item.callLogs || [])].sort((a, b) => a.n - b.n);
      const lastClosed = [...logs].reverse().find((c) => !c.isOpen);
      const closureReason = (item.status === 'closed' && lastClosed?.status) || '';
      const closedDate = item.status === 'closed' && lastClosed ? (lastClosed.time || '').split(' ')[0] : '';
      const cells = [];
      for (let i = 0; i < maxCalls; i++) {
        const c = logs[i];
        if (c) {
          const [d, t] = (c.time || ' ').split(' ');
          cells.push(q(c.calledBy), q(d), q(t || ''), q(c.status), q(c.notes),
            q(c.isOpen && i === logs.length - 1 && item.followupDate ? item.followupDate : ''));
        } else {
          cells.push('', '', '', '', '', '');
        }
      }
      const dbStatus = (() => {
        const e = phoneStatusMap.get(digitsOnly(item.phone)) || {};
        return e.isClient ? 'Client' : e.isTutor ? 'Tutor' : '';
      })();
      return [
        q(item.countryCode || '91'), q(item.phone), q(item.name), q(item.city),
        q(item.category), q(item.source), q(item.entryDate),
        q(item.status === 'open' ? 'Open' : 'Closed'), q(closureReason), q(closedDate),
        q(dbStatus), q(item.msgCount || 0), q((item.callLogs?.length) || 0), ...cells,
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.map(q).join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `protutor-calldata-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const RowMenu = ({ item }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: '8px',
            cursor: 'pointer', color: '#9ca3af',
          }}
        >
          <EllipsisVertical size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setViewFor(item.id)}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setHistoryFor(item.id)}>
          <BookOpen size={13} />
          Call History
        </DropdownMenuItem>
        {isManager && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
              onClick={() => {
                if (!isManager) { alert('Only managers can delete.'); return; }
                if (window.confirm(`Delete "${item.name || item.phone}"? This will permanently remove the number and all call logs. This cannot be undone.`)) {
                  setCallData((cur) => cur.filter((x) => x.id !== item.id));
                }
              }}
            >
              Delete Number
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const Card = ({ item }) => {
    const last = item.callLogs?.length ? item.callLogs[item.callLogs.length - 1] : null;
    const dueToday = item.followupDate && isToday(item.followupDate);
    const pstatus = phoneStatusMap.get(digitsOnly(item.phone)) || {};
    const isClient = !!pstatus.isClient;
    const isTutor = !!pstatus.isTutor;

    return (
      <div
        style={{
          background: dueToday ? '#fffbeb' : '#fff',
          border: dueToday ? '1.5px solid #fbbf24' : '1.5px solid #e0e4ef',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ padding: '14px 14px 8px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
            {item.name || 'Unnamed'}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{item.phone}</div>
        </div>

        <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          <span
            style={{
              display: 'inline-flex',
              padding: '3px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: item.status === 'open' ? '#fff7ed' : '#f3f4f6',
              color: item.status === 'open' ? '#ea580c' : '#6b7280',
              border: item.status === 'open' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
            }}
          >
            {item.status === 'open' ? 'Open' : 'Closed'}
          </span>
          {isClient && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>
              ✅ Client
            </span>
          )}
          {!isClient && isTutor && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' }}>
              🎓 Tutor
            </span>
          )}
        </div>

        <div style={{ height: '1px', background: '#eef0f8', margin: '0 14px' }} />

        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {item.city && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <MapPin size={15} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.city}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Location</div>
              </div>
            </div>
          )}
          {(item.source || item.entryDate) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Info size={15} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {item.source && <div style={{ fontSize: '13.5px', color: '#374151' }}>Source: {item.source}</div>}
                {item.entryDate && <div style={{ fontSize: '12px', color: '#9ca3af' }}>Entry: {formatDate(item.entryDate)}</div>}
              </div>
            </div>
          )}
        </div>

        {item.followupDate && (
          <div
            style={{
              margin: '0 14px 10px',
              padding: '10px 12px',
              background: dueToday ? '#fef3c7' : '#f0fdf4',
              border: dueToday ? '1px solid #fde68a' : '1px solid #bbf7d0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              color: dueToday ? '#92400e' : '#15803d',
            }}
          >
            {dueToday ? 'Call Today' : `Follow-up: ${formatDate(item.followupDate)}`}
          </div>
        )}

        <div style={{ height: '1px', background: '#eef0f8', margin: '0 14px' }} />

        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
              {(item.callLogs?.length) || 0} call{(item.callLogs?.length || 0) === 1 ? '' : 's'} made
            </div>
            {last && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>Last: {last.status}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setLogFor(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#16a34a',
                color: '#fff',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(22,163,74,0.3)',
              }}
            >
              <PhoneCall size={14} />
              Log
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <button
                onClick={() => onWhatsApp(item)}
                style={{
                  width: '38px', height: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #e5e7eb', borderRadius: '8px',
                  background: '#fff', cursor: 'pointer', color: '#6b7280',
                }}
              >
                <MessageCircle size={16} />
              </button>
              {item.msgCount > 0 && (
                <span style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1 }}>{item.msgCount}</span>
              )}
            </div>
            <RowMenu item={item} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f6fa', overflowY: 'auto' }}>
      <div className="cd-desktop">
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '0 80px' }}>
          <div style={{ paddingTop: '36px', paddingBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', lineHeight: 1.2, margin: 0 }}>
                Call Data
              </h1>
              <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px' }}>
                Track all incoming/outgoing numbers
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {isManager && (
                <button
                  onClick={exportCsv}
                  style={{ height: '44px', padding: '0 20px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}
                >
                  <Download size={15} />
                  Export
                </button>
              )}
              <button
                onClick={() => { setEditing(null); setFormOpen(true); }}
                style={{ height: '44px', padding: '0 24px', borderRadius: '10px', background: '#111827', fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}
              >
                <Plus size={15} />
                Add Number
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '20px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                style={{ paddingLeft: '38px', paddingRight: '14px', height: '42px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', outline: 'none', width: '220px', color: '#374151', fontWeight: 500 }}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-[42px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 font-medium px-3 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-[42px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 font-medium px-3 w-32">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-[42px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 font-medium px-3 w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
                <SelectItem value="Tutor">Tutor</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <div style={{ height: '42px', padding: '0 18px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
              {filtered.length} of {callData.length} numbers
            </div>
          </div>

          {/* Table layout — matching old CRM */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['CONTACT', 'DETAILS', 'STATUS', 'FOLLOW-UP', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '15px' }}>No numbers found.</td></tr>
                )}
                {filtered.map((item) => {
                  const last = item.callLogs?.length ? item.callLogs[item.callLogs.length - 1] : null;
                  const callCount = item.callLogs?.length || 0;
                  const followup = item.followupDate ? formatDate(item.followupDate) : 'No follow-up';
                  return (
                    <tr key={item.id} style={{ borderBottom: '3px double #9ca3af' }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = '#fafbff'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '18px 20px', minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <a href={telLink(item.phone, item.countryCode)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                            <PhoneCall size={15} color="#16a34a" />
                          </a>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{item.name || item.phone}</div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>📞 {item.phone}</div>
                            <div style={{ fontSize: '13px', color: '#9ca3af' }}>Entry: {formatDate(item.entryDate)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '18px 20px', minWidth: '200px' }}>
                        <div style={{ fontSize: '15px', color: '#374151', fontWeight: 500 }}>📍 {item.city || '—'}</div>
                        {item.category && <div style={{ marginTop: '3px' }}><span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '5px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{item.category}</span></div>}
                        {item.source && <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px' }}>Source: {item.source}</div>}
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <span style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                          background: item.status === 'open' ? '#fff7ed' : '#f3f4f6', color: item.status === 'open' ? '#ea580c' : '#6b7280',
                          border: item.status === 'open' ? '1px solid #fed7aa' : '1px solid #e5e7eb' }}>
                          {item.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                        {last && <div style={{ marginTop: '4px' }}><span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' }}>{last.status}</span></div>}
                        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{callCount} call{callCount !== 1 ? 's' : ''}</div>
                      </td>
                      <td style={{ padding: '18px 16px', fontSize: '15px', color: '#6b7280', minWidth: '130px' }}>{item.followupDate ? (
                        <div>
                          <div>📅 {formatDate(item.followupDate)}</div>
                          {formatTime12hr(item.followupDate) && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>🕐 {formatTime12hr(item.followupDate)}</div>}
                        </div>
                      ) : 'No follow-up'}</td>
                      <td style={{ padding: '18px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button type="button" onClick={() => setLogFor(item.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '9px 22px', borderRadius: '8px', background: '#16a34a', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                            <PhoneCall size={13} /> Log
                          </button>
                          <button type="button" onClick={() => { /* whatsapp */ }}
                            style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                            <MessageCircle size={15} color="#6b7280" />
                            {(item.msgCount || 0) > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '9px', background: '#6b7280', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.msgCount}</span>}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <EllipsisVertical size={16} color="#6b7280" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setLogFor(item.id)}>📞 Log Call</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewFor(item.id)}>👁 View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setHistoryFor(item.id)}>📋 Call History</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isManager && <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onDeleteNumber(item)} style={{ color: '#dc2626' }}>🗑 Delete Number</DropdownMenuItem>
                              </>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="cd-mobile">
        <div style={{ padding: '12px 12px 0' }}>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            style={{ width: '100%', height: '48px', borderRadius: '10px', background: '#111827', fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}
          >
            <Plus size={16} />
            Add Number
          </button>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              style={{ width: '100%', paddingLeft: '40px', paddingRight: '14px', height: '44px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', outline: 'none', color: '#374151', boxSizing: 'border-box' }}
              placeholder="Search name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '2px 12px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '15px' }}>
              No numbers found.
            </div>
          )}
          {filtered.map((item) => <Card key={item.id} item={item} />)}
        </div>
      </div>

      <AddNumberModal
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={onSaveForm}
        editItem={editing}
      />
      <CallLogModal
        open={!!logFor}
        onClose={() => setLogFor(null)}
        item={logForItem}
        type="calldata"
        onSave={onLogCall}
        currentUser={currentUser}
      />
      <ViewDetailsModal
        open={!!viewFor}
        onClose={() => setViewFor(null)}
        item={viewForItem}
        type="calldata"
        onEdit={(item) => { setEditing(item); setFormOpen(true); }}
      />
      <CallHistoryModal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        item={historyForItem}
        type="calldata"
      />
    </div>
  );
}
