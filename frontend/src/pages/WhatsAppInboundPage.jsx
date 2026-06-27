import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const fmtShortDate = (iso) => {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

const cardStyle = { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const statCardStyle = (color) => ({
  display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px 14px',
  borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  borderLeft: `3px solid ${color}`,
});
const badgeStyle = (bg, color) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
  fontWeight: 600, background: bg, color,
});

export default function WhatsAppInboundPage() {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ total: 0, client: 0, tutor: 0, pending: 0, leads: 0, notYet: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, client: 0, tutor: 0, pending: 0, leads: 0, notYet: 0 });
  const [dailyStats, setDailyStats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const loadChart = async () => {
      if (window.Chart) return;
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      document.head.appendChild(s);
      await new Promise(r => s.onload = r);
    };
    loadChart();
  }, []);

  const computeStats = (data) => ({
    total: data.length,
    client: data.filter(c => c.button_reply === 'client' && !c.is_duplicate).length,
    tutor: data.filter(c => c.button_reply === 'tutor' && !c.is_duplicate).length,
    pending: data.filter(c => c.form_status === 'pending').length,
    leads: data.filter(c => c.form_status === 'lead_received').length,
    notYet: data.filter(c => c.form_status === 'not_yet' || c.form_status === 'no_reply').length,
  });

  const fetchData = useCallback(async () => {
    try {
      // Fetch filtered calls for table
      let query = supabase
        .from('missed_calls')
        .select('*')
        .eq('source', 'whatsapp')
        .order('call_logged_at', { ascending: false })
        .limit(300);

      if (filter === 'client') query = query.eq('button_reply', 'client');
      else if (filter === 'tutor') query = query.eq('button_reply', 'tutor');
      else if (filter === 'pending') query = query.eq('form_status', 'pending');
      else if (filter === 'leads') query = query.eq('form_status', 'lead_received');
      else if (filter === 'not_yet') query = query.in('form_status', ['not_yet', 'no_reply']);
      if (search.trim()) query = query.ilike('phone_number', `%${search.trim()}%`);

      const { data } = await query;
      setCalls(data || []);

      // All-time stats
      const { data: allCalls } = await supabase
        .from('missed_calls')
        .select('id, is_duplicate, button_reply, form_status')
        .eq('source', 'whatsapp')
        .limit(10000);

      if (allCalls) setStats(computeStats(allCalls));

      // Monthly stats
      const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const nextMonth = selectedMonth === 11
        ? `${selectedYear + 1}-01-01`
        : `${selectedYear}-${String(selectedMonth + 2).padStart(2, '0')}-01`;

      const { data: monthlyCalls } = await supabase
        .from('missed_calls')
        .select('id, is_duplicate, button_reply, form_status')
        .eq('source', 'whatsapp')
        .gte('call_logged_at', monthStart)
        .lt('call_logged_at', nextMonth)
        .limit(10000);

      if (monthlyCalls) setMonthlyStats(computeStats(monthlyCalls));

      // Daily chart data
      const { data: daily } = await supabase
        .from('v_whatsapp_inbound_funnel')
        .select('*')
        .gte('day', monthStart)
        .lt('day', nextMonth)
        .order('day', { ascending: true });
      setDailyStats(daily || []);

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    }
  }, [filter, search, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Chart
  useEffect(() => {
    if (!window.Chart || !chartRef.current || !dailyStats.length) return;
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new window.Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: dailyStats.map(d => fmtShortDate(d.day)),
        datasets: [
          { label: 'Unique', data: dailyStats.map(d => d.unique_inquiries), backgroundColor: '#8b5cf6' },
          { label: 'Client', data: dailyStats.map(d => d.form_pending), backgroundColor: '#22c55e' },
          { label: 'Tutor', data: dailyStats.map(d => d.tutor_count), backgroundColor: '#f97316' },
          { label: 'Leads', data: dailyStats.map(d => d.leads_received), backgroundColor: '#f59e0b' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [dailyStats]);

  const statCardLabels = [
    { key: 'total', label: 'Total Messages', color: '#3b82f6' },
    { key: 'client', label: 'Client', color: '#22c55e' },
    { key: 'tutor', label: 'Tutor', color: '#8b5cf6' },
    { key: 'pending', label: 'Pending', color: '#f97316' },
    { key: 'leads', label: 'Leads', color: '#f59e0b' },
    { key: 'notYet', label: 'Closed', color: '#94a3b8' },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>💬</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>WhatsApp Inquiries</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#9ca3af' }}>
          {lastRefresh && <span>Updated {lastRefresh}</span>}
          <button onClick={fetchData}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>
            🔄 Refresh
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

      {/* Row 2: Monthly stat cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {months[selectedMonth]} {selectedYear}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', background: '#fff', cursor: 'pointer' }}>
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', background: '#fff', cursor: 'pointer' }}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
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

      {/* Chart */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
          Daily Breakdown — {months[selectedMonth]} {selectedYear}
        </div>
        <div style={{ height: '220px' }}>
          {dailyStats.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>No data yet</div>
            : <canvas ref={chartRef} />}
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            💬 Recent Inquiries
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Search phone..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px', width: '140px' }} />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px', cursor: 'pointer' }}>
              <option value="all">All</option>
              <option value="client">Client</option>
              <option value="tutor">Tutor</option>
              <option value="pending">Pending</option>
              <option value="leads">Leads</option>
              <option value="not_yet">Closed</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Phone', 'Date/Time', 'Type', 'City', 'Form Status', 'Follow-ups'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '10px' }}>+{call.country_code || '91'} {call.phone_number}</td>
                  <td style={{ padding: '10px', color: '#6b7280' }}>{fmtDate(call.call_logged_at)}</td>
                  <td style={{ padding: '10px' }}>
                    {call.button_reply === 'client' && <span style={badgeStyle('#d1fae5', '#065f46')}>Client</span>}
                    {call.button_reply === 'tutor' && <span style={badgeStyle('#ede9fe', '#5b21b6')}>Tutor</span>}
                    {!call.button_reply && '—'}
                  </td>
                  <td style={{ padding: '10px' }}>{call.city || '—'}</td>
                  <td style={{ padding: '10px' }}>
                    {call.form_status === 'pending' && <span style={badgeStyle('#fef3c7', '#92400e')}>Pending</span>}
                    {call.form_status === 'lead_received' && <span style={badgeStyle('#d1fae5', '#065f46')}>Lead ✓</span>}
                    {call.form_status === 'not_yet' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>Not Yet</span>}
                    {call.form_status === 'no_reply' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>No Reply</span>}
                    {call.form_status === 'NA' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>NA</span>}
                    {!call.form_status && '—'}
                  </td>
                  <td style={{ padding: '10px', color: '#6b7280' }}>{call.followup_count || 0}</td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No inquiries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
