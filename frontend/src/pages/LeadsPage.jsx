import React, { useState, useMemo, useCallback } from 'react';
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
import { LeadFormModal } from '../components/modals/LeadFormModal';
import { CallLogModal } from '../components/modals/CallLogModal';
import { CallHistoryModal } from '../components/modals/CallHistoryModal';
import { ViewDetailsModal } from '../components/modals/ViewDetailsModal';
import {
  MapPin,
  BookOpen,
  Info,
  PhoneCall,
  Phone,
  Search,
  Star,
  Download,
  UserPlus,
  MessageCircle,
  EllipsisVertical,
} from 'lucide-react';
import {
  formatDate,
  isToday,
  telLink,
  digitsOnly,
  sendWhatsAppLead,
} from '../lib/utils';
import { CITIES, STATUSES_CLOSED } from '../lib/constants';
import {
  createLead,
  updateLead,
  toggleLeadStar,
  addLeadCallLog,
  bumpLeadMsg,
} from '../lib/api';

export function LeadsPage({ leads, setLeads, currentUser, phoneStatusMap = new Map() }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [starFilter, setStarFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const [viewFor, setViewFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  const isManager = currentUser?.role === 'manager';
  const isCoordinator = currentUser?.role === 'coordinator';
  const isSupport = currentUser?.role === 'support';

  const filtered = useMemo(() => {
    let list = leads;
    if (isCoordinator) list = list.filter((l) => currentUser.cities.includes(l.city));
    if (isSupport) list = list.filter((l) => l.movedToSupport && currentUser.cities.includes(l.city));
    if (statusFilter === 'open') list = list.filter((l) => l.status === 'open');
    if (statusFilter === 'closed') list = list.filter((l) => l.status === 'closed');
    if (starFilter === 'starred') list = list.filter((l) => l.starred);
    if (starFilter === 'notstarred') list = list.filter((l) => !l.starred);
    if (cityFilter !== 'all') list = list.filter((l) => l.city === cityFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) => (l.parentName + l.mobile + (l.studentName || '')).toLowerCase().includes(q));
    }
    return list;
  }, [leads, statusFilter, starFilter, cityFilter, search, currentUser, isCoordinator, isSupport]);

  const logForLead = logFor ? leads.find((l) => l.id === logFor) : null;
  const viewForLead = viewFor ? leads.find((l) => l.id === viewFor) : null;
  const historyForLead = historyFor ? leads.find((l) => l.id === historyFor) : null;

  const onToggleStar = useCallback(
    async (id) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead) return;
      const newStarred = !lead.starred;
      setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, starred: newStarred } : l)));
      try {
        await toggleLeadStar(id, newStarred);
      } catch (e) {
        setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, starred: !newStarred } : l)));
        alert('Failed to update star: ' + e.message);
      }
    },
    [leads, setLeads]
  );

  const onMoveToSupport = useCallback(
    async (id) => {
      setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, movedToSupport: true } : l)));
      try {
        await updateLead(id, { movedToSupport: true });
      } catch (e) {
        alert('Failed: ' + e.message);
      }
    },
    [setLeads]
  );

  const onDelete = useCallback(
    async (id) => {
      // Visual-only delete in original; here we keep the same UX (optimistic remove via PUT status)
      setLeads((cur) => cur.filter((l) => l.id !== id));
    },
    [setLeads]
  );

  const onLogCall = useCallback(
    async ({ status, type, notes, followupDate }) => {
      const id = logFor;
      if (!id) return;
      try {
        const result = await addLeadCallLog(id, { status, type, notes, followupDate });
        setLeads((cur) =>
          cur.map((l) => {
            if (l.id !== id) return l;
            const callLog = result?.callLog || {
              n: (l.callLogs?.length || 0) + 1,
              status,
              notes,
              time: new Date().toISOString().replace('T', ' ').slice(0, 16),
              calledBy: currentUser?.name || currentUser?.fname || 'User',
              isOpen: type === 'open',
            };
            return {
              ...l,
              callLogs: [...(l.callLogs || []), callLog],
              status: result?.leadStatus || (type === 'closed' ? 'closed' : 'open'),
              followupDate: followupDate || l.followupDate,
            };
          })
        );
      } catch (e) {
        alert('Failed to log call: ' + e.message);
      }
    },
    [logFor, setLeads, currentUser]
  );

  const onSaveForm = useCallback(
    async (form) => {
      try {
        if (editing) {
          const updated = await updateLead(editing.id, form);
          setLeads((cur) => cur.map((l) => (l.id === editing.id ? { ...l, ...(updated || form) } : l)));
        } else {
          const created = await createLead(form);
          if (created) {
            setLeads((cur) => [created, ...cur]);
          } else {
            // Defensive: if backend doesn't return the lead, build one locally
            setLeads((cur) => [
              {
                id: Date.now(),
                ...form,
                status: 'open',
                starred: false,
                callLogs: [],
                followupDate: '',
                msgCount: 0,
                addedBy: currentUser?.name || currentUser?.fname || 'User',
                movedToSupport: false,
              },
              ...cur,
            ]);
          }
        }
        setEditing(null);
      } catch (e) {
        alert('Failed to save lead: ' + e.message);
      }
    },
    [editing, setLeads, currentUser]
  );

  const onWhatsApp = useCallback(
    async (lead) => {
      sendWhatsAppLead(lead.mobile, lead.parentName, currentUser?.name || currentUser?.fname, lead.countryCode);
      const newCount = (lead.msgCount || 0) + 1;
      setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, msgCount: newCount } : l)));
      try {
        await bumpLeadMsg(lead.id, newCount);
      } catch {}
    },
    [setLeads, currentUser]
  );

  function exportCsv() {
    const maxCalls = Math.max(0, ...filtered.map((l) => (l.callLogs?.length || 0)));
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
      'Parent Name', 'Student Name', 'Country Code', 'Phone Number', 'Email',
      'Standard', 'Subjects', 'City', 'Area / Locality', 'Class Mode',
      'Entry Date', 'Tutor Gender', 'Importance', 'Notes', 'Lead Status',
      'Closure Reason', 'Closed Date', 'DB Status (Client/Tutor)',
      'Message Sent Times', 'Call Times', ...callCols,
    ];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((lead) => {
      const logs = [...(lead.callLogs || [])].sort((a, b) => a.n - b.n);
      const lastClosed = [...logs].reverse().find((c) => !c.isOpen);
      const closureReason = (lead.status === 'closed' && lastClosed?.status) || '';
      const closedDate = lead.status === 'closed' && lastClosed ? (lastClosed.time || '').split(' ')[0] : '';
      const callCells = [];
      for (let i = 0; i < maxCalls; i++) {
        const c = logs[i];
        if (c) {
          const [date, time] = (c.time || ' ').split(' ');
          callCells.push(
            q(c.calledBy), q(date), q(time || ''), q(c.status), q(c.notes),
            q(c.isOpen && i === logs.length - 1 && lead.followupDate ? lead.followupDate : '')
          );
        } else {
          callCells.push('', '', '', '', '', '');
        }
      }
      const dbStatus = (() => {
        const e = phoneStatusMap.get(digitsOnly(lead.mobile)) || {};
        return e.isClient ? 'Client' : e.isTutor ? 'Tutor' : '';
      })();
      return [
        q(lead.parentName), q(lead.studentName), q(lead.countryCode || '91'), q(lead.mobile),
        q(lead.email), q(lead.standard), q(lead.subjects), q(lead.city), q(lead.locality),
        q(lead.classMode), q(lead.entryDate), q(lead.tutorGender), q(lead.importance),
        q(lead.notes), q(lead.status === 'open' ? 'Open' : 'Closed'),
        q(closureReason), q(closedDate), q(dbStatus), q(lead.msgCount || 0),
        q((lead.callLogs?.length) || 0), ...callCells,
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.map(q).join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `protutor-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ---- Row dropdown menu ----
  const RowMenu = ({ lead }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#9ca3af',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          <EllipsisVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLogFor(lead.id)}>
          <PhoneCall size={13} />
          Log Call
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setViewFor(lead.id)}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setHistoryFor(lead.id)}>
          <BookOpen size={13} />
          Call History
        </DropdownMenuItem>
        {isManager && (
          <DropdownMenuItem onClick={() => onMoveToSupport(lead.id)}>
            <UserPlus size={13} />
            Move to Support
          </DropdownMenuItem>
        )}
        {isManager && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
              onClick={() => {
                if (window.confirm('Delete this lead?')) onDelete(lead.id);
              }}
            >
              Delete Lead
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ---- Mobile card view ----
  const Card = ({ lead }) => {
    const last = lead.callLogs?.length ? lead.callLogs[lead.callLogs.length - 1] : null;
    const isClosedStatus = last && STATUSES_CLOSED.includes(last.status);
    const dueToday = lead.followupDate && isToday(lead.followupDate);
    const calledToday = (lead.callLogs || []).some((c) => isToday(c.time));
    const pstatus = phoneStatusMap.get(digitsOnly(lead.mobile)) || {};
    const isClient = !!pstatus.isClient;
    const isTutor = !!pstatus.isTutor;
    const locationStr = [lead.city, lead.locality].filter(Boolean).join(', ');
    const academicStr = [lead.standard, lead.subjects].filter(Boolean).join(' - ');

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 14px 0', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                onClick={() => onToggleStar(lead.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: lead.starred ? '#f59e0b' : '#d1d5db',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                <Star size={18} fill={lead.starred ? '#f59e0b' : 'none'} />
              </button>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={15} color="#16a34a" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.parentName || '—'}
                </div>
                {lead.studentName && (
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Student: {lead.studentName}</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: '#6b7280', marginBottom: '2px', paddingLeft: '2px' }}>
              <Phone size={13} color="#22c55e" style={{ flexShrink: 0 }} />
              {lead.mobile}
            </div>
          </div>
          <a
            href={telLink(lead.mobile, lead.countryCode)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: '#16a34a',
              color: '#fff',
              borderRadius: '12px',
              width: '80px',
              height: '64px',
              textDecoration: 'none',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(22,163,74,0.4)',
            }}
          >
            <PhoneCall size={22} strokeWidth={2.5} />
            <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.06em' }}>DIAL</span>
          </a>
        </div>

        <div style={{ padding: '8px 14px 8px', display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              padding: '3px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: lead.status === 'open' ? '#fff7ed' : '#f3f4f6',
              color: lead.status === 'open' ? '#ea580c' : '#6b7280',
              border: lead.status === 'open' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
            }}
          >
            {lead.status === 'open' ? 'Open' : 'Closed'}
          </span>
          {calledToday && (
            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
              ✓ Called Today
            </span>
          )}
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
          {locationStr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <MapPin size={15} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{locationStr}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Location</div>
              </div>
            </div>
          )}
          {academicStr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <BookOpen size={15} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{academicStr}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Academic Info</div>
              </div>
            </div>
          )}
          {(lead.source || lead.entryDate) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Info size={15} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {lead.source && <div style={{ fontSize: '13.5px', color: '#374151' }}>Source: {lead.source}</div>}
                {lead.entryDate && <div style={{ fontSize: '12px', color: '#9ca3af' }}>Entry: {formatDate(lead.entryDate)}</div>}
              </div>
            </div>
          )}
        </div>

        {lead.followupDate && (
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
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dueToday ? 'Call Today' : `Follow-up: ${formatDate(lead.followupDate)}`}
          </div>
        )}

        {last && (
          <div style={{ padding: '0 14px 8px' }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '3px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 500,
                background: isClosedStatus ? '#f3f4f6' : '#1e293b',
                color: isClosedStatus ? '#6b7280' : '#fff',
              }}
            >
              {last.status}
            </span>
          </div>
        )}

        <div style={{ height: '1px', background: '#eef0f8', margin: '0 14px' }} />

        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
              {(lead.callLogs?.length) || 0} call{(lead.callLogs?.length || 0) === 1 ? '' : 's'} made
            </div>
            {last && (
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>Last: {last.status}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setLogFor(lead.id)}
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
                onClick={() => onWhatsApp(lead)}
                style={{
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                <MessageCircle size={16} />
              </button>
              {lead.msgCount > 0 && (
                <span style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1 }}>{lead.msgCount}</span>
              )}
            </div>
            <RowMenu lead={lead} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f6fa', overflowY: 'auto' }}>
      {/* Desktop */}
      <div className="lp-desktop">
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '0 80px' }}>
          <div style={{ paddingTop: '36px', paddingBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', lineHeight: 1.2, margin: 0 }}>
                Leads Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px' }}>
                Managing leads for your assigned cities
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {isManager && (
                <button
                  onClick={exportCsv}
                  style={{
                    height: '44px',
                    padding: '0 20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={15} />
                  Export
                </button>
              )}
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                style={{
                  height: '44px',
                  padding: '0 24px',
                  borderRadius: '10px',
                  background: '#111827',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <UserPlus size={15} />
                Add New Lead
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '20px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                style={{
                  paddingLeft: '38px',
                  paddingRight: '14px',
                  height: '42px',
                  fontSize: '14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  background: '#fff',
                  outline: 'none',
                  width: '220px',
                  color: '#374151',
                  fontWeight: 500,
                }}
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
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={starFilter} onValueChange={setStarFilter}>
              <SelectTrigger className="h-[42px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 font-medium px-3 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="starred">⭐ Starred</SelectItem>
                <SelectItem value="notstarred">Not Starred</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-[42px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 font-medium px-3 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              style={{
                height: '42px',
                padding: '0 18px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: '#374151',
              }}
            >
              {filtered.length} of {leads.length} leads
            </div>
          </div>

          {/* Table layout — matching old CRM */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['CONTACT', 'DETAILS', 'STATUS', 'FOLLOW-UP', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '15px' }}>No leads found.</td></tr>
                )}
                {filtered.map((lead) => {
                  const last = lead.callLogs?.length ? lead.callLogs[lead.callLogs.length - 1] : null;
                  const callCount = lead.callLogs?.length || 0;
                  const isStarred = lead.starred;
                  const followup = lead.followupDate ? formatDate(lead.followupDate) : null;
                  const hasFormData = lead.hourlyFee || lead.monthlyEstimate || lead.daysPerWeek || lead.hoursPerSession || lead.mapsLink || lead.expectedQuote || (lead.tutorGender && lead.tutorGender !== 'Any') || (lead.quoteAccepted !== undefined && lead.quoteAccepted !== null && lead.quoteAccepted !== '');
                  return (
                    <React.Fragment key={lead.id}>
                    <tr style={{ borderBottom: hasFormData ? 'none' : '3px double #e5e7eb' }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = '#fafbff'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '18px 20px', minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button type="button" onClick={() => onToggleStar(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                            <Star size={18} fill={isStarred ? '#f59e0b' : 'none'} color={isStarred ? '#f59e0b' : '#d1d5db'} />
                          </button>
                          <a href={telLink(lead.mobile, lead.countryCode)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                            <PhoneCall size={18} color="#16a34a" />
                          </a>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                              {lead.parentName || lead.mobile}
                              {lead.classMode && lead.classMode !== 'Any' && (
                                <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: lead.classMode === 'Online' ? '#eff6ff' : '#f3f4f6', color: lead.classMode === 'Online' ? '#2563eb' : '#6b7280', border: `1px solid ${lead.classMode === 'Online' ? '#bfdbfe' : '#e5e7eb'}` }}>
                                  {lead.classMode}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>📞 {lead.mobile}</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Entry: {formatDate(lead.entryDate)}{lead.source ? ` / ${lead.source}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '18px 20px', minWidth: '200px' }}>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>📍 {[lead.city, lead.locality].filter(Boolean).join(', ') || '—'}</div>
                        {(lead.standard || lead.subjects) && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>📚 {[lead.standard, lead.subjects].filter(Boolean).join(' - ')}</div>}
                        {lead.studentName && <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px' }}>Student: {lead.studentName}</div>}
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: lead.status === 'open' ? '#fff7ed' : '#f3f4f6', color: lead.status === 'open' ? '#ea580c' : '#6b7280', border: lead.status === 'open' ? '1px solid #fed7aa' : '1px solid #e5e7eb' }}>
                          {lead.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                        {last && <div style={{ marginTop: '6px' }}><span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600, background: '#1e293b', color: '#fff' }}>{last.status}</span></div>}
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{callCount} call{callCount !== 1 ? 's' : ''}</div>
                      </td>
                      <td style={{ padding: '18px 16px', fontSize: '14px', color: '#6b7280', minWidth: '130px' }}>
                        {followup ? <span>📅 {followup}</span> : 'No follow-up'}
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button type="button" onClick={() => { setCallLogItem(lead); setCallLogType('lead'); setCallLogOpen(true); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '8px', background: '#16a34a', color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                            <PhoneCall size={14} /> Log
                          </button>
                          <button type="button" onClick={() => onWhatsApp(lead)}
                            style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                            <MessageCircle size={16} color="#6b7280" />
                            {(lead.msgCount || 0) > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '10px', background: '#6b7280', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{lead.msgCount}</span>}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <EllipsisVertical size={16} color="#6b7280" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => { setCallLogItem(lead); setCallLogType('lead'); setCallLogOpen(true); }}>📞 Log Call</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setViewItem(lead); setViewType('lead'); setViewOpen(true); }}>👁 View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setHistoryItem(lead); setHistoryType('lead'); setHistoryOpen(true); }}>📋 Call History</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditing(lead); setFormOpen(true); }}>✏️ Edit Lead</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                    {hasFormData && (
                      <tr style={{ borderBottom: '3px double #e5e7eb' }}>
                        <td colSpan={5} style={{ padding: '0 20px 14px' }}>
                          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '7px 14px', marginLeft: '82px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', background: '#ede9fe', borderRadius: '4px', flexShrink: 0 }}>Form data</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap', fontSize: '12px', color: '#5b21b6' }}>
                              {[
                                lead.tutorGender && lead.tutorGender !== 'Any' ? lead.tutorGender : null,
                                (lead.daysPerWeek || lead.hoursPerSession) ? `${lead.daysPerWeek || ''}${lead.daysPerWeek && lead.hoursPerSession ? ' / ' : ''}${lead.hoursPerSession || ''}` : null,
                                lead.hourlyFee ? (String(lead.hourlyFee).includes('/') ? lead.hourlyFee : `${lead.hourlyFee}/hr`) : null,
                              ].filter(Boolean).map((txt, i) => (
                                <span key={i} style={{ padding: '0 7px', borderRight: '1px solid #d8b4fe' }}>{txt}</span>
                              ))}
                              {lead.monthlyEstimate && <span style={{ padding: '0 7px', borderRight: (lead.quoteAccepted || lead.expectedQuote || lead.mapsLink) ? '1px solid #d8b4fe' : 'none', fontWeight: 600 }}>{String(lead.monthlyEstimate).includes('/') ? lead.monthlyEstimate : `${lead.monthlyEstimate}/mo`}</span>}
                              {lead.quoteAccepted !== undefined && lead.quoteAccepted !== null && lead.quoteAccepted !== '' && (
                                <span style={{ padding: '0 7px', borderRight: (lead.expectedQuote || lead.mapsLink) ? '1px solid #d8b4fe' : 'none' }}>Quote: <span style={{ fontWeight: 600, color: lead.quoteAccepted === 'Yes' || lead.quoteAccepted === true ? '#16a34a' : '#dc2626' }}>{String(lead.quoteAccepted)}</span></span>
                              )}
                              {lead.expectedQuote && <span style={{ padding: '0 7px', borderRight: lead.mapsLink ? '1px solid #d8b4fe' : 'none' }}>Parent: <span style={{ fontWeight: 600 }}>{lead.expectedQuote}</span></span>}
                              {lead.mapsLink && (
                                <span style={{ padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <a href={lead.mapsLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Map</a>
                                  <button type="button" onClick={() => { try { navigator.clipboard.writeText(lead.mapsLink); } catch(e) {} }} style={{ cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', background: '#ede9fe', border: 'none', fontSize: '11px', color: '#7c3aed' }} title="Copy map link">📋</button>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="lp-mobile">
        <div style={{ padding: '12px 12px 0' }}>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '10px',
              background: '#111827',
              fontSize: '15px',
              fontWeight: 700,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <UserPlus size={16} />
            Add New Lead
          </button>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '13px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none',
              }}
            />
            <input
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '14px',
                height: '44px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                background: '#fff',
                outline: 'none',
                color: '#374151',
                boxSizing: 'border-box',
              }}
              placeholder="Search name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '2px 12px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              No leads found.
            </div>
          )}
          {filtered.map((lead) => <Card key={lead.id} lead={lead} />)}
        </div>
      </div>

      <LeadFormModal
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={onSaveForm}
        editLead={editing}
      />
      <CallLogModal
        open={!!logFor}
        onClose={() => setLogFor(null)}
        item={logForLead}
        type="lead"
        onSave={onLogCall}
        currentUser={currentUser}
      />
      <ViewDetailsModal
        open={!!viewFor}
        onClose={() => setViewFor(null)}
        item={viewForLead}
        type="lead"
        onEdit={(lead) => { setEditing(lead); setFormOpen(true); }}
      />
      <CallHistoryModal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        item={historyForLead}
        type="lead"
      />
    </div>
  );
}
