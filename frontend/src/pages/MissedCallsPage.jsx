import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PhoneCall, RefreshCw, Search, Battery, Wifi, WifiOff, Filter } from 'lucide-react';

// ── Chart.js loader (same pattern as DashboardPage) ──
let chartJsLoaded = false;
function loadChartJs() {
  return new Promise((resolve) => {
    if (chartJsLoaded || window.Chart) { chartJsLoaded = true; return resolve(); }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = () => { chartJsLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

// ── Date helpers ──
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mm = months[dt.getMonth()];
  const yy = String(dt.getFullYear()).slice(2);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${dd} ${mm} ${yy}, ${hh}:${mi}`;
}

function fmtShortDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${dd} ${months[dt.getMonth()]}`;
}

// ── Styles ──
const cardStyle = {
  background: '#fff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  padding: '16px',
};

const statCardStyle = (color) => ({
  ...cardStyle,
  borderLeft: `4px solid ${color}`,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

const badgeStyle = (bg, color) => ({
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '6px',
  background: bg,
  color: color,
});

// ── Component ──
export function MissedCallsPage() {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ total: 0, unique: 0, sent: 0, failed: 0, noReply: 0, pending: 0, leads: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, unique: 0, sent: 0, failed: 0, noReply: 0, pending: 0, leads: 0 });
  const [dailyStats, setDailyStats] = useState([]);
  const [heartbeat, setHeartbeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch calls with filter
      let query = supabase
        .from('missed_calls')
        .select('*')
        .order('call_logged_at', { ascending: false })
        .limit(300);

      if (filter === 'sent') query = query.eq('msg_status', 'sent');
      else if (filter === 'failed') query = query.eq('msg_status', 'failed');
      else if (filter === 'duplicate') query = query.eq('is_duplicate', true);

      if (search.trim()) {
        query = query.ilike('phone_number', `%${search.trim()}%`);
      }

      const { data: callsData } = await query;
      setCalls(callsData || []);

      // Fetch all for stats
      const { data: allCalls } = await supabase
        .from('missed_calls')
        .select('id, is_duplicate, msg_status, form_status, button_reply')
        .limit(10000);

      if (allCalls) {
        setStats({
          total: allCalls.length,
          unique: allCalls.filter(c => !c.is_duplicate).length,
          sent: allCalls.filter(c => c.msg_status === 'sent').length,
          failed: allCalls.filter(c => c.msg_status === 'failed').length,
          noReply: allCalls.filter(c => c.msg_status === 'sent' && !c.button_reply && !c.is_duplicate).length,
          pending: allCalls.filter(c => c.form_status === 'pending').length,
          leads: allCalls.filter(c => c.form_status === 'lead_received').length,
        });
      }

      // Fetch monthly funnel data
      const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const nextMonth = selectedMonth === 11
        ? `${selectedYear + 1}-01-01`
        : `${selectedYear}-${String(selectedMonth + 2).padStart(2, '0')}-01`;

      // Fetch monthly stats from missed_calls
      const { data: monthlyCalls } = await supabase
        .from('missed_calls')
        .select('id, is_duplicate, msg_status, form_status, button_reply')
        .gte('call_logged_at', monthStart)
        .lt('call_logged_at', nextMonth)
        .limit(10000);

      if (monthlyCalls) {
        setMonthlyStats({
          total: monthlyCalls.length,
          unique: monthlyCalls.filter(c => !c.is_duplicate).length,
          sent: monthlyCalls.filter(c => c.msg_status === 'sent').length,
          failed: monthlyCalls.filter(c => c.msg_status === 'failed').length,
          noReply: monthlyCalls.filter(c => c.msg_status === 'sent' && !c.button_reply && !c.is_duplicate).length,
          pending: monthlyCalls.filter(c => c.form_status === 'pending').length,
          leads: monthlyCalls.filter(c => c.form_status === 'lead_received').length,
        });
      }

      const { data: daily } = await supabase
        .from('v_missed_call_funnel')
        .select('*')
        .gte('day', monthStart)
        .lt('day', nextMonth)
        .order('day', { ascending: true });
      setDailyStats(daily || []);

      // Fetch heartbeat
      const { data: hb } = await supabase
        .from('phone_heartbeat')
        .select('*')
        .order('last_ping_at', { ascending: false })
        .limit(1);
      if (hb?.length) setHeartbeat(hb[0]);

      setLastRefresh(new Date());
    } catch (err) {
      console.error('MissedCalls fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, search, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Chart rendering ──
  useEffect(() => {
    if (!dailyStats.length) return;
    loadChartJs().then(() => {
      if (!chartRef.current || !window.Chart) return;
      if (chartInstance.current) chartInstance.current.destroy();

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: dailyStats.map(d => fmtShortDate(d.day)),
          datasets: [
            { label: 'Total', data: dailyStats.map(d => d.total_calls), backgroundColor: '#3b82f6', borderRadius: 4 },
            { label: 'Unique', data: dailyStats.map(d => d.unique_calls), backgroundColor: '#8b5cf6', borderRadius: 4 },
            { label: 'Sent', data: dailyStats.map(d => d.msgs_sent), backgroundColor: '#22c55e', borderRadius: 4 },
            { label: 'Leads', data: dailyStats.map(d => d.leads_received), backgroundColor: '#f59e0b', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 11 } } } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { beginAtZero: true, ticks: { font: { size: 11 }, stepSize: 1 } },
          },
        },
      });
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [dailyStats]);

  const isPhoneOnline = heartbeat && (Date.now() - new Date(heartbeat.last_ping_at).getTime()) < 10 * 60 * 1000;

  const statCardLabels = [
    { key: 'total', label: 'Total Calls', color: '#3b82f6' },
    { key: 'unique', label: 'Unique', color: '#8b5cf6' },
    { key: 'sent', label: 'WA Sent', color: '#22c55e' },
    { key: 'failed', label: 'WA Failed', color: '#ef4444' },
    { key: 'noReply', label: 'No Reply', color: '#94a3b8' },
    { key: 'pending', label: 'Pending', color: '#f97316' },
    { key: 'leads', label: 'Leads', color: '#f59e0b' },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PhoneCall size={20} color="#7c3aed" />
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>Missed Calls Tracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Phone status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
            {isPhoneOnline ? (
              <>
                <Wifi size={14} color="#22c55e" />
                <span style={{ color: '#22c55e', fontWeight: 600 }}>Phone Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>Phone Offline</span>
              </>
            )}
            {heartbeat && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Battery size={12} /> {heartbeat.battery_level}%
              </span>
            )}
          </div>
          {lastRefresh && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 12px', fontSize: '12px', fontWeight: 600,
              background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px',
              cursor: 'pointer', color: '#374151',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Row 1: All-time stat cards */}
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>All Time</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {statCardLabels.map(({ key, label, color }) => (
          <div key={`all-${key}`} style={statCardStyle(color)}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{stats[key]}</span>
          </div>
        ))}
      </div>

      {/* Row 2: Monthly stat cards with month/year selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {months[selectedMonth]} {selectedYear}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: '6px',
              fontSize: '11px', background: '#fff', outline: 'none', cursor: 'pointer',
            }}
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: '6px',
              fontSize: '11px', background: '#fff', outline: 'none', cursor: 'pointer',
            }}
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {statCardLabels.map(({ key, label, color }) => (
          <div key={`month-${key}`} style={statCardStyle(color)}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{monthlyStats[key]}</span>
          </div>
        ))}
      </div>

      {/* Monthly Summary Funnel */}
      {(() => {
        const mTotal = dailyStats.reduce((s, d) => s + (d.total_calls || 0), 0);
        const mUnique = dailyStats.reduce((s, d) => s + (d.unique_calls || 0), 0);
        const mSent = dailyStats.reduce((s, d) => s + (d.msgs_sent || 0), 0);
        const mClient = dailyStats.reduce((s, d) => s + (d.button_client || 0), 0);
        const mTutor = dailyStats.reduce((s, d) => s + (d.button_tutor || 0), 0);
        const mLeads = dailyStats.reduce((s, d) => s + (d.leads_received || 0), 0);
        const funnelSteps = [
          { label: 'Calls', value: mTotal, color: '#3b82f6' },
          { label: 'Unique', value: mUnique, color: '#8b5cf6' },
          { label: 'WA Sent', value: mSent, color: '#22c55e' },
          { label: 'Replied', value: mClient + mTutor, color: '#6366f1' },
          { label: 'Clients', value: mClient, color: '#0ea5e9' },
          { label: 'Leads', value: mLeads, color: '#f59e0b' },
        ];
        return (
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
              {months[selectedMonth]} {selectedYear} — Calls to Leads
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
              {funnelSteps.map((step, i) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    textAlign: 'center', padding: '10px 16px',
                    background: step.value > 0 ? `${step.color}10` : '#f9fafb',
                    borderRadius: '8px', minWidth: '80px',
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: step.color }}>{step.value}</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginTop: '2px' }}>{step.label}</div>
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <span style={{ fontSize: '16px', color: '#d1d5db', margin: '0 4px' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Chart */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
          Daily Breakdown — {months[selectedMonth]} {selectedYear}
        </div>
        <div style={{ height: '260px', position: 'relative' }}>
          {dailyStats.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>
              No data yet
            </div>
          ) : (
            <canvas ref={chartRef} />
          )}
        </div>
      </div>

      {/* Filters + Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} /> Missed Calls
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  paddingLeft: '28px', paddingRight: '10px', paddingTop: '5px', paddingBottom: '5px',
                  border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', width: '160px',
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: '8px',
                fontSize: '12px', background: '#fff', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">All</option>
              <option value="sent">WA Sent</option>
              <option value="failed">WA Failed</option>
              <option value="duplicate">Duplicates</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Phone', 'Date/Time', 'WA Status', 'Reply', 'Form Status', 'Dup'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No missed calls found</td></tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>
                      +{call.country_code || '91'} {call.phone_number}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                      {fmtDate(call.call_logged_at)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {call.msg_status === 'sent' && <span style={badgeStyle('#dcfce7', '#166534')}>Sent</span>}
                      {call.msg_status === 'failed' && <span style={badgeStyle('#fee2e2', '#991b1b')}>Failed</span>}
                      {call.msg_status === 'pending' && <span style={badgeStyle('#fef3c7', '#92400e')}>Pending</span>}
                      {!call.msg_status && <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {call.button_reply === 'client' && <span style={badgeStyle('#dbeafe', '#1e40af')}>Client</span>}
                      {call.button_reply === 'tutor' && <span style={badgeStyle('#f3e8ff', '#6b21a8')}>Tutor</span>}
                      {!call.button_reply && <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {call.form_status === 'lead_received' && <span style={badgeStyle('#dcfce7', '#166534')}>Lead ✓</span>}
                      {call.form_status === 'pending' && <span style={badgeStyle('#fef3c7', '#92400e')}>Pending</span>}
                      {call.form_status === 'NA' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>NA</span>}
                      {call.form_status === 'not_yet' && <span style={badgeStyle('#ffedd5', '#9a3412')}>Not Yet</span>}
                      {!call.form_status && <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {call.is_duplicate && <span style={badgeStyle('#f3f4f6', '#6b7280')}>DUP</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
