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
  const [stats, setStats] = useState({ total: 0, unique: 0, client: 0, tutor: 0, unknown: 0, pending: 0, leads: 0, notYet: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ total: 0, unique: 0, client: 0, tutor: 0, unknown: 0, pending: 0, leads: 0, notYet: 0 });
  const [dailyStats, setDailyStats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDetails, setShowDetails] = useState(false);
  const [detailedData, setDetailedData] = useState({ dayOfWeek: [], followups: [] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ phone: '', type: 'client', city: '' });
  const [saving, setSaving] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const dowChartRef = useRef(null);
  const dowChartInstance = useRef(null);

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

  const computeStats = (data) => {
    const total = data.length;
    const unique = data.filter(c => !c.is_duplicate).length;
    const client = data.filter(c => c.button_reply === 'client' && !c.is_duplicate).length;
    const tutor = data.filter(c => c.button_reply === 'tutor' && !c.is_duplicate).length;
    const unknown = unique - client - tutor;
    return {
      total, unique, client, tutor, unknown,
      pending: data.filter(c => c.form_status === 'pending').length,
      leads: data.filter(c => c.form_status === 'lead_received').length,
      notYet: data.filter(c => c.form_status === 'not_yet' || c.form_status === 'no_reply').length,
    };
  };

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
      else if (filter === 'unknown') query = query.is('button_reply', null).eq('is_duplicate', false);
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

      // ---- Detailed analysis: day-of-week + followup effectiveness ----
      const { data: detailRows } = await supabase
        .from('missed_calls')
        .select('call_logged_at, is_duplicate, form_status, followup_count')
        .eq('source', 'whatsapp')
        .gte('call_logged_at', monthStart)
        .lt('call_logged_at', nextMonth)
        .eq('is_duplicate', false)
        .limit(10000);

      if (detailRows) {
        const dowData = [0, 1, 2, 3, 4, 5, 6].map(d => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d],
          total: 0,
          leads: 0,
        }));
        detailRows.forEach(r => {
          const d = new Date(r.call_logged_at).getDay();
          dowData[d].total++;
          if (r.form_status === 'lead_received') dowData[d].leads++;
        });

        const followupBuckets = [1, 2, 3].map(n => {
          const sent = detailRows.filter(r => (r.followup_count || 0) >= n).length;
          const leads = detailRows.filter(r => (r.followup_count || 0) >= n && r.form_status === 'lead_received').length;
          const pct = sent > 0 ? Math.round((leads / sent) * 100) : 0;
          return { followup: n, sent, leads, pct };
        });

        setDetailedData({ dayOfWeek: dowData, followups: followupBuckets });
      }

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
          { label: 'Client', data: dailyStats.map(d => d.client_count || 0), backgroundColor: '#22c55e', stack: 'unique', borderRadius: 0 },
          { label: 'Tutor', data: dailyStats.map(d => d.tutor_count || 0), backgroundColor: '#8b5cf6', stack: 'unique', borderRadius: 0 },
          { label: 'Unknown', data: dailyStats.map(d => Math.max(0, (d.unique_inquiries || 0) - (d.client_count || 0) - (d.tutor_count || 0))), backgroundColor: '#d1d5db', stack: 'unique', borderRadius: 4 },
          { label: 'Leads', data: dailyStats.map(d => d.leads_received || 0), backgroundColor: '#f59e0b', stack: 'leads', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { stacked: true, beginAtZero: true, ticks: { font: { size: 11 }, stepSize: 1 } },
        },
      },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [dailyStats]);

  // Day-of-week chart
  useEffect(() => {
    if (!showDetails || !detailedData.dayOfWeek.length || !window.Chart || !dowChartRef.current) return;
    if (dowChartInstance.current) dowChartInstance.current.destroy();
    dowChartInstance.current = new window.Chart(dowChartRef.current, {
      type: 'bar',
      data: {
        labels: detailedData.dayOfWeek.map(d => d.day),
        datasets: [
          { label: 'Total Inquiries', data: detailedData.dayOfWeek.map(d => d.total), backgroundColor: '#8b5cf6' },
          { label: 'Leads', data: detailedData.dayOfWeek.map(d => d.leads), backgroundColor: '#f59e0b' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
    return () => { if (dowChartInstance.current) dowChartInstance.current.destroy(); };
  }, [showDetails, detailedData]);

  const statCardLabels = [
    { key: 'total', label: 'Total Messages', color: '#3b82f6' },
    { key: 'client', label: 'Client', color: '#22c55e' },
    { key: 'tutor', label: 'Tutor', color: '#8b5cf6' },
    { key: 'unknown', label: 'Unknown', color: '#d1d5db' },
    { key: 'pending', label: 'Pending', color: '#f97316' },
    { key: 'leads', label: 'Leads', color: '#f59e0b' },
    { key: 'notYet', label: 'Closed', color: '#94a3b8' },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const handleStop = async (id) => {
    await supabase
      .from('missed_calls')
      .update({ form_status: 'stopped', updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchData();
  };

  const handleAddEntry = async () => {
    const phone = newEntry.phone.replace(/[^0-9]/g, '');
    const normalized = phone.length === 12 && phone.startsWith('91') ? phone.substring(2) : phone;
    if (normalized.length !== 10) { alert('Enter a valid 10-digit phone number'); return; }

    setSaving(true);

    // Check for open records (any source)
    const { data: openRecords } = await supabase
      .from('missed_calls')
      .select('id, source, form_status')
      .eq('phone_number', normalized)
      .eq('is_duplicate', false)
      .or('form_status.is.null,form_status.eq.pending')
      .limit(1);

    if (openRecords && openRecords.length > 0) {
      setSaving(false);
      const src = openRecords[0].source === 'call' ? 'Missed Calls' : 'WhatsApp Inquiries';
      alert(`This number already has an open record in ${src}. Cannot add duplicate.`);
      return;
    }

    const { error } = await supabase.from('missed_calls').insert({
      phone_number: normalized,
      country_code: '91',
      call_logged_at: new Date().toISOString(),
      msg_status: 'sent',
      button_reply: newEntry.type === 'unknown' ? null : 'client',
      button_id: 'manual entry',
      form_status: newEntry.type === 'client' ? 'pending' : null,
      source: 'whatsapp',
      city: newEntry.city || null,
      is_duplicate: false,
      followup_count: 0,
    });
    setSaving(false);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNewEntry({ phone: '', type: 'client', city: '' });
      setShowAddForm(false);
      fetchData();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>💬</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>WhatsApp Inquiries</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
          {lastRefresh && <span>Updated {lastRefresh}</span>}
          <button onClick={fetchData}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowAddForm(s => !s)}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: showAddForm ? '#3b82f6' : '#fff', color: showAddForm ? '#fff' : '#374151', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
            + Add Inquiry
          </button>
        </div>
      </div>

      {/* Manual entry form */}
      {showAddForm && (
        <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Phone Number</div>
            <input
              type="text" placeholder="10-digit number" value={newEntry.phone}
              onChange={e => setNewEntry(p => ({ ...p, phone: e.target.value }))}
              style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', width: '160px' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Type</div>
            <select value={newEntry.type} onChange={e => setNewEntry(p => ({ ...p, type: e.target.value }))}
              style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <option value="client">Client</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>City</div>
            <select value={newEntry.city} onChange={e => setNewEntry(p => ({ ...p, city: e.target.value }))}
              style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <option value="">Select</option>
              <option value="Chennai">Chennai</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Mumbai">Mumbai</option>
            </select>
          </div>
          <button onClick={handleAddEntry} disabled={saving}
            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
            Daily Breakdown — {months[selectedMonth]} {selectedYear}
          </div>
          <button
            onClick={() => setShowDetails(s => !s)}
            style={{
              padding: '5px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
              background: showDetails ? '#3b82f6' : '#fff', color: showDetails ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: '12px', fontWeight: 500,
            }}
          >
            {showDetails ? '▼ Hide Detailed Analysis' : '▶ Detailed Analysis'}
          </button>
        </div>
        <div style={{ height: '220px' }}>
          {dailyStats.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>No data yet</div>
            : <canvas ref={chartRef} />}
        </div>
      </div>

      {/* Detailed Analysis (collapsible) */}
      {showDetails && (
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
            Day-of-Week Pattern — {months[selectedMonth]} {selectedYear}
          </div>
          <div style={{ height: '220px', position: 'relative', marginBottom: '20px' }}>
            <canvas ref={dowChartRef} />
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px', marginTop: '20px' }}>
            Follow-up Effectiveness
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Stage</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Sent</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Leads After</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {detailedData.followups.map(f => (
                  <tr key={f.followup} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px' }}>Follow-up {f.followup}</td>
                    <td style={{ padding: '10px' }}>{f.sent}</td>
                    <td style={{ padding: '10px' }}>{f.leads}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: f.pct >= 10 ? '#16a34a' : f.pct >= 5 ? '#f97316' : '#6b7280' }}>
                      {f.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <option value="unknown">Unknown</option>
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
                {['Phone', 'Date/Time', 'Type', 'City', 'Form Status', 'Follow-ups', 'Action'].map(h => (
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
                    {!call.button_reply && <span style={badgeStyle('#f3f4f6', '#6b7280')}>Unknown</span>}
                  </td>
                  <td style={{ padding: '10px' }}>{call.city || '—'}</td>
                  <td style={{ padding: '10px' }}>
                    {call.form_status === 'pending' && <span style={badgeStyle('#fef3c7', '#92400e')}>Pending</span>}
                    {call.form_status === 'lead_received' && <span style={badgeStyle('#d1fae5', '#065f46')}>Lead ✓</span>}
                    {call.form_status === 'not_yet' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>Not Yet</span>}
                    {call.form_status === 'no_reply' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>No Reply</span>}
                    {call.form_status === 'stopped' && <span style={badgeStyle('#fee2e2', '#991b1b')}>Stopped</span>}
                    {call.form_status === 'NA' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>NA</span>}
                    {!call.form_status && '—'}
                  </td>
                  <td style={{ padding: '10px', color: '#6b7280' }}>{call.followup_count || 0}</td>
                  <td style={{ padding: '10px' }}>
                    {(!call.form_status || call.form_status === 'pending') && !call.is_duplicate && (
                      <button onClick={() => handleStop(call.id)}
                        style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>
                        Stop
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No inquiries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
