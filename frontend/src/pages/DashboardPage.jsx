import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDashboardStats } from '../lib/api';

// ── Month / year helpers ──────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();
function yearRange() {
  const arr = [];
  for (let y = CURRENT_YEAR; y >= 2024; y--) arr.push(y);
  return arr;
}

// ── Chart.js loader ───────────────────────────────────────────
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

// ── Shared styles ─────────────────────────────────────────────
const card = { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' };
const sTitle = { fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' };
const tbl = { width: '100%', fontSize: '13px', borderCollapse: 'collapse' };
const th = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280', borderBottom: '2px solid #e5e7eb', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const thR = { ...th, textAlign: 'right' };
const td = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 };
const tdR = { ...td, textAlign: 'right' };
const selectStyle = { height: '38px', padding: '0 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', color: '#374151', cursor: 'pointer' };

function Badge({ children, color = '#6b7280', bg = '#f3f4f6' }) {
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color, background: bg }}>{children}</span>;
}

function Bar({ value, max, color = '#3b82f6' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.3s' }} />
    </div>
  );
}

function StatCard({ label, value, color = '#111827', sub }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px 18px', flex: '1 1 0', minWidth: '130px' }}>
      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

function AlertRow({ label, sub, count, bg, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: bg, marginBottom: '8px' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{sub}</div>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 800, color }}>{count}</div>
    </div>
  );
}

// ── Status colors for stacked chart ───────────────────────────
const STATUS_COLORS = {
  'Qualified':                '#7F77DD',
  'Not Attended':             '#888780',
  'Not Connected':            '#BA7517',
  'Not Reachable':            '#854F0B',
  'Busy':                     '#D85A30',
  'Switch Off':               '#993556',
  'Call Later':               '#1D9E75',
  'Check with Family':        '#5DCAA5',
  'Doubtful':                 '#85B7EB',
  'Created Enquiry':          '#378ADD',
  'In Mapping':               '#3266ad',
  'Got Another':              '#F09595',
  'Not Interested':           '#E24B4A',
  'Not Required':             '#A32D2D',
  'Low Fee':                  '#C2410C',
  'Not Okay for Subscription':'#9A3412',
  'Assigned to Coordinator':  '#534AB7',
  'Not the Parent Number':    '#72243E',
  'Start Later':              '#639922',
  'Outer Area':               '#412402',
  'Added as Tutor':           '#0F6E56',
  'Existing Tutor':           '#085041',
  'No Response':              '#73726c',
  'Others':                   '#B4B2A9',
};
function getStatusColor(status) {
  if (STATUS_COLORS[status]) return STATUS_COLORS[status];
  let hash = 0;
  for (let i = 0; i < status.length; i++) hash = status.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 45%, 50%)`;
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export function DashboardPage({ currentUser }) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [city, setCity] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reasonsRef = useRef(null);
  const dailyRef = useRef(null);
  const reasonsChart = useRef(null);
  const dailyChart = useRef(null);

  const isManager = currentUser?.role === 'manager';
  const isCoordinator = currentUser?.role === 'coordinator';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats(month, year, city);
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month, year, city]);

  useEffect(() => { load(); }, [load]);

  // ── Draw charts when stats arrive ──────────────────────────
  useEffect(() => {
    if (!stats) return;
    loadChartJs().then(() => {
      drawDailyChart();
      drawReasonsChart();
    });
  }, [stats]);

  function drawReasonsChart() {
    if (!reasonsRef.current || !stats?.closedReasons?.length) return;
    if (reasonsChart.current) reasonsChart.current.destroy();

    const reasons = stats.closedReasons;
    const labels = reasons.map(r => r.reason);
    const data = reasons.map(r => r.count);
    const pcts = reasons.map(r => r.percentage);
    const h = Math.max(reasons.length * 36 + 60, 180);
    reasonsRef.current.parentElement.style.height = h + 'px';

    reasonsChart.current = new window.Chart(reasonsRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: '#7F77DD', borderRadius: 4, barThickness: 22 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${c.raw} (${pcts[c.dataIndex]}%)` } },
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
          y: { grid: { display: false }, ticks: { font: { size: 12 }, color: '#374151' } },
        },
      },
    });
  }

  function drawDailyChart() {
    if (!dailyRef.current || !stats?.dailyCalls?.length) return;
    if (dailyChart.current) dailyChart.current.destroy();

    const raw = stats.dailyCalls;
    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = [];
    for (let d = 1; d <= daysInMonth; d++) labels.push(d);

    const statusSet = new Set();
    raw.forEach(r => statusSet.add(r.status));
    const statuses = Array.from(statusSet);

    const map = {};
    raw.forEach(r => {
      if (!map[r.day]) map[r.day] = {};
      map[r.day][r.status] = r.count;
    });

    const dayTotals = labels.map(d => {
      let t = 0;
      statuses.forEach(s => { t += (map[d]?.[s] || 0); });
      return t;
    });

    const datasets = statuses.map(s => ({
      label: s,
      data: labels.map(d => map[d]?.[s] || 0),
      backgroundColor: getStatusColor(s),
      borderRadius: 2,
    }));

    dailyChart.current = new window.Chart(dailyRef.current, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, autoSkip: false } },
          y: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        },
        animation: {
          onComplete: function () {
            const chart = this;
            const ctx = chart.ctx;
            ctx.font = '500 10px Inter, sans-serif';
            ctx.fillStyle = '#6b7280';
            ctx.textAlign = 'center';
            const meta = chart.getDatasetMeta(datasets.length - 1);
            meta.data.forEach((bar, i) => {
              if (dayTotals[i] > 0) ctx.fillText(dayTotals[i], bar.x, bar.y - 6);
            });
          },
        },
      },
    });
  }

  // ── Loading / error ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9ca3af', fontSize: '14px' }}>
        Loading dashboard...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
        <div style={{ fontSize: '14px', color: '#ef4444' }}>{error}</div>
        <button onClick={load} style={{ padding: '8px 20px', borderRadius: '8px', background: '#111827', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }
  if (!stats) return null;

  const { summary, mtsStats, byCity, bySource, closedReasons, dailyCalls, alerts, availableCities } = stats;
  const convRate = summary.total > 0 ? ((summary.converted / summary.total) * 100).toFixed(1) : '0';
  const mtsConvRate = mtsStats.total > 0 ? ((mtsStats.converted / mtsStats.total) * 100).toFixed(1) : '0';
  const maxCity = Math.max(...(byCity || []).map(c => c.total), 1);
  const maxSource = Math.max(...(bySource || []).map(s => s.total), 1);
  const dailyStatuses = Array.from(new Set((dailyCalls || []).map(r => r.status)));

  // City options for dropdown
  const cityOptions = isManager
    ? (availableCities || [])
    : (currentUser?.cities || []);

  return (
    <div style={{ padding: '0 0 40px', maxWidth: '1200px' }}>

      {/* ── Header + Month/Year/City filter ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
            {isManager ? 'Manager Dashboard' : 'My Dashboard'}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
            {city || (isManager ? 'All cities' : (currentUser?.cities || []).join(', '))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
            {yearRange().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {cityOptions.length > 1 && (
            <select value={city} onChange={(e) => setCity(e.target.value)} style={selectStyle}>
              <option value="">{isManager ? 'All cities' : 'All my cities'}</option>
              {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={load} style={{ height: '38px', padding: '0 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* ── ROW 1: Summary cards ──────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <StatCard label="Total leads" value={summary.total} />
        <StatCard label="Open" value={summary.open} color="#b45309" />
        <StatCard label="Closed" value={summary.closed} color="#0f6e56" />
        <StatCard label="Converted" value={summary.converted} color="#378ADD" sub={`${convRate}% conversion`} />
        <StatCard label="Starred" value={summary.starred} color="#BA7517" />
      </div>

      {/* ── ROW 2: Moved to support cards ─────────────────── */}
      {mtsStats.total > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <StatCard label="Moved to support" value={mtsStats.total} color="#5b21b6" />
          <StatCard label="MTS — Open" value={mtsStats.open} color="#b45309" />
          <StatCard label="MTS — Closed" value={mtsStats.closed} color="#0f6e56" />
          <StatCard label="MTS — Converted" value={mtsStats.converted} color="#378ADD" sub={`${mtsConvRate}% conversion`} />
        </div>
      )}

      {/* ── ROW 3: Daily calls chart (top priority) ───────── */}
      <div style={card}>
        <div style={sTitle}>{isCoordinator ? 'My daily calls' : 'Daily calls'}</div>
        {dailyCalls && dailyCalls.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
              {dailyStatuses.map((s, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: getStatusColor(s), flexShrink: 0 }} />
                  {s}
                </span>
              ))}
            </div>
            <div style={{ position: 'relative', width: '100%', height: '300px' }}>
              <canvas ref={dailyRef}></canvas>
            </div>
          </>
        ) : (
          <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '30px' }}>No calls this month</div>
        )}
      </div>

      {/* ── ROW 4: City-wise ──────────────────────────────── */}
      {byCity && byCity.length > 0 && (
        <div style={card}>
          <div style={sTitle}>Leads by city</div>
          <table style={tbl}>
            <thead><tr><th style={th}>City</th><th style={thR}>Total</th><th style={thR}>Open</th><th style={thR}>Closed</th><th style={{ ...th, width: '100px' }}></th></tr></thead>
            <tbody>
              {byCity.map((c, i) => (
                <tr key={i}>
                  <td style={td}>{c.city}</td>
                  <td style={tdR}><strong>{c.total}</strong></td>
                  <td style={tdR}><Badge color="#b45309" bg="#fffbeb">{c.open}</Badge></td>
                  <td style={tdR}><Badge color="#0f6e56" bg="#ecfdf5">{c.closed}</Badge></td>
                  <td style={td}><Bar value={c.total} max={maxCity} color="#7F77DD" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ROW 5: Source performance ─────────────────────── */}
      {bySource && bySource.length > 0 && (
        <div style={card}>
          <div style={sTitle}>Source performance</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Source</th>
                  <th style={thR}>Total</th>
                  <th style={thR}>Open</th>
                  <th style={thR}>Closed</th>
                  <th style={thR}>Converted</th>
                  <th style={thR}>Conv %</th>
                  <th style={{ ...th, width: '90px' }}></th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((s, i) => (
                  <tr key={i}>
                    <td style={td}>{s.source}</td>
                    <td style={tdR}><strong>{s.total}</strong></td>
                    <td style={tdR}><Badge color="#b45309" bg="#fffbeb">{s.open}</Badge></td>
                    <td style={tdR}><Badge color="#0f6e56" bg="#ecfdf5">{s.closed}</Badge></td>
                    <td style={tdR}><Badge color="#185FA5" bg="#E6F1FB">{s.converted}</Badge></td>
                    <td style={tdR}>
                      <Badge
                        color={s.conversionRate > 30 ? '#0f6e56' : s.conversionRate > 10 ? '#b45309' : '#991b1b'}
                        bg={s.conversionRate > 30 ? '#ecfdf5' : s.conversionRate > 10 ? '#fffbeb' : '#fef2f2'}
                      >{s.conversionRate}%</Badge>
                    </td>
                    <td style={td}><Bar value={s.total} max={maxSource} color="#378ADD" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROW 6: Closed lead reasons (horizontal bar) ───── */}
      <div style={card}>
        <div style={sTitle}>Closed lead reasons</div>
        {closedReasons && closedReasons.length > 0 ? (
          <div style={{ position: 'relative', width: '100%', height: '260px' }}>
            <canvas ref={reasonsRef}></canvas>
          </div>
        ) : (
          <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '30px' }}>No closed leads this month</div>
        )}
      </div>

      {/* ── ROW 7: Alerts (live) ──────────────────────────── */}
      <div style={card}>
        <div style={sTitle}>Attention needed</div>
        <AlertRow label={isCoordinator ? "My calls today" : "Calls made today"} sub="Total calls logged today" count={alerts?.callsToday || 0} bg="#eff6ff" color="#185FA5" />
        <AlertRow label="Never called" sub="Open leads with zero call logs" count={alerts?.neverCalled || 0} bg="#fef2f2" color="#991b1b" />
        <AlertRow label="Follow-ups due today" sub="Scheduled for today, not yet called" count={alerts?.followupsDueToday || 0} bg="#fffbeb" color="#92400e" />
        <AlertRow label="Moved to support" sub="Open leads in support queue" count={alerts?.movedToSupport || 0} bg="#f5f3ff" color="#5b21b6" />
      </div>
    </div>
  );
}
