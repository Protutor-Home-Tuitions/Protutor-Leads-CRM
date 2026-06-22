import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { LeadsPage } from './pages/LeadsPage';
import { CallDataPage } from './pages/CallDataPage';
import { UsersPage } from './pages/UsersPage';
import { DashboardPage } from './pages/DashboardPage';
import { Bell, Phone, Clock, X } from 'lucide-react';
import {
  fetchLeads,
  fetchCallData,
  fetchUsers,
  getToken,
  clearToken,
  checkMonthlySignout,
  isTokenExpired,
} from './lib/api';
import { useFollowupNotifications } from './lib/useFollowupNotifications';
import { greetingFor, formatFollowupTime } from './lib/utils';

const PAGE_TITLES = {
  leads: 'Leads',
  calldata: 'Call Data',
  users: 'User Management',
  dashboard: 'Dashboard',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [signedOutMsg, setSignedOutMsg] = useState('');
  const [page, setPage] = useState('leads');
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [callData, setCallData] = useState([]);

  // Browser notifications 15 mins before follow-up
  useFollowupNotifications(leads, callData, user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [phoneStatusMap] = useState(new Map());
  const alertsRef = useRef(null);
  const greetingRef = useRef(null);

  // ---- 401 handler: backend lost auth → clear token and bounce to login ----
  useEffect(() => {
    function onUnauth() {
      try { localStorage.removeItem('crm_user'); } catch {}
      setUser(null);
      setLeads([]);
      setCallData([]);
      setUsers([]);
    }
    window.addEventListener('crm:unauthorized', onUnauth);
    return () => window.removeEventListener('crm:unauthorized', onUnauth);
  }, []);

  // ---- Re-hydrate user on refresh from localStorage ----
  useEffect(() => {
    if (getToken() && !user) {
      try {
        const storedUser = localStorage.getItem('crm_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch {}
    }
  }, [user]);

  // ---- Reload functions exposed to pages so they can refetch with new filters ----
  // Default to status=open so initial load and reloads with no args stay small.
  const reloadLeads = useCallback(async (params = { status: 'open' }) => {
    try {
      const ls = await fetchLeads(params);
      setLeads(ls || []);
    } catch (e) {
      console.error('Failed to load leads:', e);
    }
  }, []);

  const reloadCallData = useCallback(async (params = { status: 'open' }) => {
    try {
      const cd = await fetchCallData(params);
      setCallData(cd || []);
    } catch (e) {
      console.error('Failed to load call data:', e);
    }
  }, []);

  // ---- Load all data after login ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Initial fetch: open leads + open call data only (server-side filtered)
      await reloadLeads({ status: 'open' });
      await reloadCallData({ status: 'open' });

      if (user.role === 'manager') {
        try {
          const us = await fetchUsers();
          setUsers(us || []);
        } catch (e) {
          console.error('Failed to load users:', e);
        }
      }
    })();
  }, [user, reloadLeads, reloadCallData]);

  // ---- Follow-up alert computation ----
  const computeAlerts = useCallback(
    (currentLeads, currentCallData, currentUser) => {
      const now = new Date();
      const ADVANCE_MS = 15 * 60 * 1000; // 15 minutes
      const userName = (currentUser?.name || currentUser?.fname || '').toLowerCase();

      // Combine leads + call data
      const allItems = [
        ...(currentLeads || []).map(l => ({
          id: l.id, name: l.parentName || l.mobile, number: l.mobile,
          followupDate: l.followupDate, status: l.status, callLogs: l.callLogs, _type: 'lead',
        })),
        ...(currentCallData || []).map(c => ({
          id: c.id, name: c.name || c.phone, number: c.phone,
          followupDate: c.followupDate, status: c.status, callLogs: c.callLogs, _type: 'number',
        })),
      ];

      return allItems
        .filter(item => item.followupDate && item.status === 'open' && !dismissed.has(item.id))
        .filter(item => {
          // Only show if last call log was by current user
          const lastLog = item.callLogs?.length ? item.callLogs[item.callLogs.length - 1] : null;
          if (!lastLog) return false;
          const loggedBy = (lastLog.calledBy || lastLog.called_by_name || '').toLowerCase();
          return loggedBy === userName;
        })
        .filter(item => {
          // Show upcoming (15 mins before) + overdue (up to 24h past)
          const followup = new Date(item.followupDate);
          if (isNaN(followup.getTime())) return false;
          const diffMs = followup.getTime() - now.getTime();
          return diffMs <= ADVANCE_MS && diffMs > -24 * 60 * 60 * 1000;
        })
        .map(item => {
          const followup = new Date(item.followupDate);
          const lastLog = item.callLogs[item.callLogs.length - 1];
          return {
            id: item.id,
            name: item.name,
            number: item.number,
            followupDate: item.followupDate,
            isOverdue: followup < now,
            isUpcoming: followup > now,
            type: item._type,
            lastNotes: lastLog?.notes || '',
            lastStatus: lastLog?.status || '',
          };
        })
        .sort((a, b) => new Date(a.followupDate) - new Date(b.followupDate));
    },
    [dismissed]
  );

  useEffect(() => {
    if (!user) return;
    const tick = () => setAlerts(computeAlerts(leads, callData, user));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [user, leads, callData, computeAlerts]);

  // Close the alerts popover on outside click
  useEffect(() => {
    function onDown(e) {
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const dismissAlert = (id) => {
    setDismissed((cur) => new Set([...cur, id]));
    setAlerts((cur) => cur.filter((a) => a.id !== id));
  };

  // Pick a greeting once per session (avoids re-randomising on every render)
  const greeting = useMemo(() => {
    if (!user) return null;
    if (!greetingRef.current) {
      greetingRef.current = greetingFor(user.name || user.fname || 'there');
    }
    return greetingRef.current;
  }, [user]);

  // ---- Render: unauth → login ----
  if (!user) {
    return <LoginPage onLogin={(u) => {
      setSignedOutMsg('');
      try { localStorage.setItem('crm_user', JSON.stringify(u)); } catch {}
      setUser(u);
    }} signedOutMsg={signedOutMsg} />;
  }

  const alertCount = alerts.length;
  const title = PAGE_TITLES[page] || 'Leads';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar
          currentPage={page}
          onNavigate={(p) => { setPage(p); setSidebarOpen(false); }}
          currentUser={user}
          onLogout={() => {
            clearToken();
            try { localStorage.removeItem('crm_user'); } catch {}
            setUser(null);
            greetingRef.current = null;
          }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between h-14 flex-shrink-0 gap-4">
          <button className="lg:hidden text-gray-500 flex-shrink-0" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="hidden lg:flex flex-col justify-center min-w-0 flex-1">
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {greeting?.time}
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: '#9ca3af',
                marginTop: '1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {greeting?.quote}
            </div>
          </div>
          <span className="lg:hidden text-[14px] font-semibold text-gray-700 flex-1">{title}</span>

          {/* Alert bell */}
          <div className="relative flex-shrink-0" ref={alertsRef}>
            <button
              onClick={() => setAlertsOpen((s) => !s)}
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: alertsOpen ? '#f3f4f6' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Bell size={16} color={alertCount > 0 ? '#ea580c' : '#6b7280'} />
              {alertCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    minWidth: '18px',
                    height: '18px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '99px',
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 0 0 2px #fff',
                    lineHeight: 1,
                  }}
                >
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            {alertsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '340px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  zIndex: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Follow-up Alerts</div>
                  {alertCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {alertCount} due
                    </span>
                  )}
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>All caught up!</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                        No follow-ups due right now
                      </div>
                    </div>
                  ) : (
                    alerts.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f9fafb',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: a.isOverdue ? '#fff7ed' : a.isUpcoming ? '#eff6ff' : '#fff',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: a.isOverdue ? '#fef3c7' : '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Phone size={15} color={a.isOverdue ? '#ea580c' : '#16a34a'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {a.name}
                            {a.isOverdue ? (
                              <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fecaca', color: '#991b1b', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>OVERDUE</span>
                            ) : (
                              <span style={{ marginLeft: '6px', fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>UPCOMING</span>
                            )}
                            {a.type === 'number' && <span style={{ marginLeft: '4px', fontSize: '10px', background: '#f3f4f6', color: '#6b7280', padding: '1px 5px', borderRadius: '3px' }}>Call Data</span>}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Phone size={11} color="#22c55e" /> {a.number}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: '#9ca3af',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={11} /> Call at {formatFollowupTime(a.followupDate)}
                          </div>
                          {a.lastStatus && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Last: {a.lastStatus}</div>}
                          {a.lastNotes && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {a.lastNotes}</div>}
                        </div>
                        <button
                          onClick={() => dismissAlert(a.id)}
                          style={{
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9ca3af',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {alertCount > 0 && (
                  <div
                    style={{
                      padding: '10px 16px',
                      borderTop: '1px solid #f3f4f6',
                      textAlign: 'center',
                    }}
                  >
                    <button
                      onClick={() => {
                        alerts.forEach((a) => dismissAlert(a.id));
                        setAlertsOpen(false);
                      }}
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Dismiss all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {page === 'leads' && (
            <LeadsPage
              leads={leads}
              setLeads={setLeads}
              currentUser={user}
              phoneStatusMap={phoneStatusMap}
              reloadLeads={reloadLeads}
            />
          )}
          {page === 'calldata' && (
            <CallDataPage
              callData={callData}
              setCallData={setCallData}
              currentUser={user}
              phoneStatusMap={phoneStatusMap}
              reloadCallData={reloadCallData}
            />
          )}
          {page === 'users' && user.role === 'manager' && (
            <UsersPage users={users} setUsers={setUsers} currentUser={user} />
          )}
          {page === 'dashboard' && <DashboardPage currentUser={user} />}
        </div>
      </div>
    </div>
  );
}
