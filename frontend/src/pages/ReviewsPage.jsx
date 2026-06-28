import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

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

const EDGE_FUNC_URL = 'https://baddtkhuvgymwqmetoxg.supabase.co/functions/v1/send-review';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2,'0')} ${months[d.getMonth()]}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

// Fuzzy column header matcher
function findColumn(rowKeys, candidates) {
  const lower = rowKeys.map(k => ({ orig: k, norm: k.toLowerCase().replace(/[^a-z0-9]/g, '') }));
  for (const cand of candidates) {
    const cnorm = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hit = lower.find(k => k.norm.includes(cnorm) || cnorm.includes(k.norm));
    if (hit) return hit.orig;
  }
  return null;
}

// Fuzzy city matcher (80%+ match)
function normalizeCity(input) {
  const c = String(input || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!c) return '';
  if (c.includes('chen') || c === 'chennai') return 'Chennai';
  if (c.includes('beng') || c.includes('bang') || c === 'bangalore' || c === 'bengaluru') return 'Bangalore';
  if (c.includes('mum') || c === 'mumbai' || c === 'bombay') return 'Mumbai';
  if (c.includes('hyd') || c === 'hyderabad') return 'Hyderabad';
  return '';
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, sent: 0, done: 0, ignored: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const fileRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      let query = supabase
        .from('review_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (filter !== 'all') query = query.eq('review_status', filter);
      if (search.trim()) query = query.or(`phone_number.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`);

      const { data } = await query;
      setReviews(data || []);

      const { data: allData } = await supabase
        .from('review_requests')
        .select('id, review_status')
        .limit(10000);

      if (allData) {
        setStats({
          total: allData.length,
          pending: allData.filter(r => r.review_status === 'pending').length,
          sent: allData.filter(r => r.review_status === 'sent').length,
          done: allData.filter(r => r.review_status === 'done').length,
          ignored: allData.filter(r => r.review_status === 'ignored').length,
        });
      }

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const sendable = reviews.filter(r => r.review_status !== 'done' && r.review_status !== 'ignored' && r.send_count < 5);
    if (selected.size === sendable.length && sendable.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sendable.map(r => r.id)));
    }
  };

  const handleSendReview = async () => {
    if (selected.size === 0) { alert('Select tutors first'); return; }
    setSending(true);
    try {
      const response = await fetch(EDGE_FUNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const result = await response.json();
      const msg = [
        `Sent: ${result.sent || 0}`,
        result.skipped_rate_limit ? `Skipped (last sent < 7 days ago): ${result.skipped_rate_limit}` : null,
        result.failed ? `Failed: ${result.failed}` : null,
        result.errors?.length ? `Errors: ${result.errors[0]}` : null,
      ].filter(Boolean).join('\n');
      alert(msg);
      setSelected(new Set());
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSending(false);
  };

  const handleIgnore = async (id) => {
    await supabase
      .from('review_requests')
      .update({ review_status: 'ignored', updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchData();
  };

  const handleMarkDone = async (id) => {
    await supabase
      .from('review_requests')
      .update({ review_status: 'done', updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchData();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        alert('No data in file');
        setImporting(false);
        return;
      }

      // Detect column names (fuzzy)
      const keys = Object.keys(rows[0]);
      const nameCol = findColumn(keys, ['name', 'tutorname', 'tutor', 'fullname']);
      const phoneCol = findColumn(keys, ['phone', 'mobile', 'number', 'whatsapp', 'contact']);
      const cityCol = findColumn(keys, ['city', 'location', 'place', 'area']);

      if (!nameCol || !phoneCol) {
        alert(`Could not find name/phone columns. Found columns: ${keys.join(', ')}`);
        setImporting(false);
        return;
      }

      let added = 0, skipped = 0;
      const errors = [];
      const duplicates = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row[nameCol] || '').trim();
        let phone = String(row[phoneCol] || '').trim();
        const city = cityCol ? normalizeCity(row[cityCol]) : '';

        phone = phone.replace(/[^0-9]/g, '');
        if (phone.length === 12 && phone.startsWith('91')) phone = phone.substring(2);

        if (!name) { errors.push(`Row ${i + 2}: missing name`); continue; }
        if (phone.length !== 10 || !/^[6-9]/.test(phone)) { errors.push(`Row ${i + 2}: invalid phone "${row[phoneCol]}"`); continue; }

        const { error } = await supabase
          .from('review_requests')
          .insert({
            name,
            phone_number: phone,
            city: city || null,
            type: 'tutor',
            review_status: 'pending',
          });

        if (error) {
          if (error.code === '23505') {
            skipped++;
            duplicates.push(`${name} (${phone})`);
          } else {
            errors.push(`Row ${i + 2}: ${error.message}`);
          }
        } else {
          added++;
        }
      }

      setImportResult({ added, skipped, errors, duplicates, total: rows.length });
      fetchData();
    } catch (err) {
      alert('Import error: ' + err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const statCards = [
    { key: 'total', label: 'Total', color: '#3b82f6' },
    { key: 'pending', label: 'Pending', color: '#f97316' },
    { key: 'sent', label: 'Sent', color: '#8b5cf6' },
    { key: 'done', label: 'Done', color: '#22c55e' },
    { key: 'ignored', label: 'Ignored', color: '#94a3b8' },
  ];

  const sendableCount = reviews.filter(r => r.review_status !== 'done' && r.review_status !== 'ignored' && r.send_count < 5).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>⭐</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Reviews</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
          {lastRefresh && <span>Updated {lastRefresh}</span>}
          <button onClick={fetchData}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>
            🔄 Refresh
          </button>
          <label style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
            {importing ? '⏳ Importing...' : '📥 Import Excel'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} disabled={importing} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div style={{ ...cardStyle, marginBottom: '12px', padding: '12px 16px', fontSize: '13px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>Import complete.</strong> Added: {importResult.added}, Duplicates skipped: {importResult.skipped}, Errors: {importResult.errors.length}
              {importResult.duplicates.length > 0 && (
                <details style={{ marginTop: '6px' }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280' }}>Show duplicates ({importResult.duplicates.length})</summary>
                  <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto', fontSize: '12px', color: '#374151' }}>
                    {importResult.duplicates.map((d, i) => <div key={i}>• {d}</div>)}
                  </div>
                </details>
              )}
              {importResult.errors.length > 0 && (
                <details style={{ marginTop: '6px' }}>
                  <summary style={{ cursor: 'pointer', color: '#dc2626' }}>Show errors ({importResult.errors.length})</summary>
                  <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto', fontSize: '12px', color: '#dc2626' }}>
                    {importResult.errors.map((e, i) => <div key={i}>• {e}</div>)}
                  </div>
                </details>
              )}
            </div>
            <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px' }}>✕</button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {statCards.map(({ key, label, color }) => (
          <div key={key} style={statCardStyle(color)}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{stats[key]}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>⭐ Tutor Reviews</span>
            {selected.size > 0 && (
              <button onClick={handleSendReview} disabled={sending}
                style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Sending...' : `Send Review-T (${selected.size})`}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Search name/phone..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px', width: '160px' }} />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px', cursor: 'pointer' }}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="done">Done</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '40px' }}>
                  <input type="checkbox"
                    checked={sendableCount > 0 && selected.size === sendableCount}
                    onChange={handleSelectAll} />
                </th>
                {['Name', 'Phone', 'City', 'Type', 'Status', 'Sent', 'Last Sent', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => {
                const canSend = r.review_status !== 'done' && r.review_status !== 'ignored' && r.send_count < 5;
                const isFinal = r.review_status === 'done' || r.review_status === 'ignored';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb', background: selected.has(r.id) ? '#eff6ff' : 'transparent' }}>
                    <td style={{ padding: '10px' }}>
                      {canSend && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '10px', color: '#6b7280' }}>+91 {r.phone_number}</td>
                    <td style={{ padding: '10px' }}>{r.city || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={badgeStyle(r.type === 'tutor' ? '#ede9fe' : '#d1fae5', r.type === 'tutor' ? '#5b21b6' : '#065f46')}>
                        {r.type === 'tutor' ? 'Tutor' : 'Parent'}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {r.review_status === 'pending' && <span style={badgeStyle('#fef3c7', '#92400e')}>Pending</span>}
                      {r.review_status === 'sent' && <span style={badgeStyle('#ede9fe', '#5b21b6')}>Sent</span>}
                      {r.review_status === 'done' && <span style={badgeStyle('#d1fae5', '#065f46')}>Done ✓</span>}
                      {r.review_status === 'ignored' && <span style={badgeStyle('#f3f4f6', '#6b7280')}>Ignored</span>}
                    </td>
                    <td style={{ padding: '10px', color: '#6b7280' }}>{r.send_count || 0}/5</td>
                    <td style={{ padding: '10px', color: '#6b7280', fontSize: '12px' }}>{fmtDate(r.last_sent_at)}</td>
                    <td style={{ padding: '10px' }}>
                      {!isFinal && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleMarkDone(r.id)}
                            style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #86efac', background: '#fff', color: '#16a34a', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>
                            Mark Done
                          </button>
                          <button onClick={() => handleIgnore(r.id)}
                            style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>
                            Ignore
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {reviews.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No reviews found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
