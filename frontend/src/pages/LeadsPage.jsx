// src/pages/LeadsPage.jsx
import { useState, useMemo } from 'react'
import { Star, Phone, MessageSquare, MoreVertical, Plus, Download } from 'lucide-react'
import { Button, Badge, Avatar, EmptyState, PageHeader } from '../components/ui'
import CallLogModal from '../components/modals/CallLogModal'
import LeadFormModal from '../components/modals/LeadFormModal'
import { leads as leadsApi } from '../lib/api'
import { BRAND, CITIES } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'

export default function LeadsPage({ leads, setLeads }) {
  const { user } = useAuth()

  // Filters
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('open')
  const [cityFilter, setCity]       = useState('')
  const [starFilter, setStar]       = useState(false)

  // Modals
  const [logItem, setLogItem]       = useState(null)
  const [editLead, setEditLead]     = useState(null)
  const [addOpen, setAddOpen]       = useState(false)
  const [menuOpen, setMenuOpen]     = useState(null)

  // ── Filtered leads ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (search) {
        const q = search.toLowerCase()
        if (!l.parentName?.toLowerCase().includes(q) &&
            !l.mobile?.includes(q) &&
            !l.studentName?.toLowerCase().includes(q)) return false
      }
      if (statusFilter && statusFilter !== 'all' && l.status !== statusFilter) return false
      if (cityFilter && l.city !== cityFilter) return false
      if (starFilter && !l.starred) return false
      return true
    })
  }, [leads, search, statusFilter, cityFilter, starFilter])

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleStar(lead) {
    try {
      const data = await leadsApi.star(lead.id, !lead.starred)
      setLeads(prev => prev.map(l => l.id === lead.id ? data.lead : l))
    } catch (err) { alert(err.message) }
  }

  async function handleLogCall(payload) {
    const data = await leadsApi.logCall(logItem.id, payload)
    setLeads(prev => prev.map(l => l.id === logItem.id ? data.lead : l))
  }

  async function handleSaveLead(form) {
    if (editLead) {
      const data = await leadsApi.update(editLead.id, form)
      setLeads(prev => prev.map(l => l.id === editLead.id ? data.lead : l))
    } else {
      const data = await leadsApi.create(form)
      setLeads(prev => [data.lead, ...prev])
    }
    setEditLead(null)
    setAddOpen(false)
  }

  async function handleDelete(lead) {
    if (!confirm(`Delete lead for ${lead.parentName || lead.mobile}?`)) return
    try {
      await leadsApi.delete(lead.id)
      setLeads(prev => prev.filter(l => l.id !== lead.id))
    } catch (err) { alert(err.message) }
    setMenuOpen(null)
  }

  async function handleMsg(lead) {
    try {
      const data = await leadsApi.sendMsg(lead.id)
      setLeads(prev => prev.map(l => l.id === lead.id ? data.lead : l))
    } catch (err) { alert(err.message) }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function followupBadge(lead) {
    if (!lead.followupDate) return null
    const today = new Date().toISOString().split('T')[0]
    const date = lead.followupDate.split('T')[0]
    const lastLog = lead.callLogs?.[lead.callLogs.length - 1]
    const calledToday = lastLog?.time?.startsWith(today)
    const style = {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    }
    if (calledToday) return <span style={{ ...style, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>✓ Called Today</span>
    if (date === today) return <span style={{ ...style, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>📅 Call Today</span>
    return <span style={{ ...style, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>📅 {date}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '24px 28px' }}>

      <PageHeader
        title="Leads Dashboard"
        subtitle="Managing leads for your assigned cities"
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download size={13} /> Export
            </Button>
            <Button variant="dark" onClick={() => setAddOpen(true)}>
              <Plus size={13} /> Add New Lead
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or number..."
          style={{
            border: `1px solid ${BRAND.border}`, borderRadius: '8px',
            padding: '7px 12px', fontSize: '13px', outline: 'none', width: '200px',
          }}
        />
        {[
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
          { value: 'all', label: 'All' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setStatus(opt.value)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: `1px solid ${statusFilter === opt.value ? BRAND.accent : BRAND.border}`,
            background: statusFilter === opt.value ? '#f0fdf4' : '#fff',
            color: statusFilter === opt.value ? BRAND.accent : BRAND.textSub,
            cursor: 'pointer',
          }}>{opt.label}</button>
        ))}
        <select
          value={cityFilter}
          onChange={e => setCity(e.target.value)}
          style={{ border: `1px solid ${BRAND.border}`, borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none' }}
        >
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: '13px', color: BRAND.textSub, marginLeft: '4px' }}>
          {filtered.length} of {leads.length} leads
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No leads found" description="Try adjusting your filters or add a new lead." />
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${BRAND.border}`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 130px 140px', padding: '10px 16px', background: '#fafafa', borderBottom: `1px solid ${BRAND.border}` }}>
            {['CONTACT', 'DETAILS', 'STATUS', 'FOLLOW-UP', 'ACTIONS'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textMuted, letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(lead => (
            <div
              key={lead.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 130px 140px',
                padding: '14px 16px', borderBottom: `1px solid ${BRAND.bg}`,
                alignItems: 'center', transition: 'background 0.1s',
                borderLeft: lead.starred ? `3px solid ${BRAND.warning}` : '3px solid transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {/* Contact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => handleStar(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: lead.starred ? '#d97706' : BRAND.textMuted }}>
                  <Star size={14} fill={lead.starred ? '#d97706' : 'none'} />
                </button>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={13} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: BRAND.textMain }}>
                    {lead.parentName || lead.mobile}
                    {lead.classMode && (
                      <span style={{
                        marginLeft: '8px', padding: '2px 8px', borderRadius: '4px',
                        fontSize: '11px', fontWeight: 600,
                        background: lead.classMode === 'Online' ? '#eff6ff' : '#f3f4f6',
                        color: lead.classMode === 'Online' ? '#2563eb' : '#6b7280',
                        border: `1px solid ${lead.classMode === 'Online' ? '#bfdbfe' : '#e5e7eb'}`,
                      }}>
                        {lead.classMode}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: BRAND.textMuted }}>📞 {lead.mobile}</div>
                  <div style={{ fontSize: '11px', color: BRAND.textMuted }}>
                    Entry: {lead.entryDate} / {lead.source}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <div style={{ fontSize: '12px', color: BRAND.textSub }}>
                  📍 {lead.city}
                  {lead.city === 'Online' && lead.onlineLocation
                    ? ` · ${lead.onlineLocation}`
                    : lead.locality ? `, ${lead.locality}` : ''}
                </div>
                <div style={{ fontSize: '12px', color: BRAND.textSub }}>📚 {lead.standard} - {lead.subjects}</div>
                {lead.studentName && <div style={{ fontSize: '12px', color: BRAND.textMuted }}>Student: {lead.studentName}</div>}
              </div>

              {/* Status */}
              <div>
                <Badge status={lead.status}>{lead.status === 'open' ? 'Open' : 'Closed'}</Badge>
                <div style={{ fontSize: '11px', color: BRAND.textMuted, marginTop: '4px' }}>
                  {lead.callLogs?.length || 0} call{lead.callLogs?.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Follow-up */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {followupBadge(lead) || <span style={{ fontSize: '12px', color: BRAND.textMuted }}>No follow-up</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <Button size="sm" onClick={() => setLogItem(lead)}>
                  <Phone size={12} /> Log
                </Button>
                <button
                  onClick={() => handleMsg(lead)}
                  title="Send message"
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: BRAND.textSub }}
                >
                  <MessageSquare size={13} />
                </button>
                <button
                  onClick={() => setMenuOpen(menuOpen === lead.id ? null : lead.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: BRAND.textSub }}
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen === lead.id && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', zIndex: 50,
                    background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: '160px',
                  }}>
                    {[
                      { label: '📞 Log Call', action: () => { setLogItem(lead); setMenuOpen(null) } },
                      { label: '📋 View Details', action: () => setMenuOpen(null) },
                      { label: '✏️ Edit Lead', action: () => { setEditLead(lead); setMenuOpen(null) } },
                    ].map(item => (
                      <button key={item.label} onClick={item.action} style={{
                        width: '100%', padding: '10px 14px', border: 'none', background: 'none',
                        textAlign: 'left', fontSize: '13px', color: BRAND.textMain, cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = BRAND.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >{item.label}</button>
                    ))}
                    <div style={{ borderTop: `1px solid ${BRAND.border}` }} />
                    <button onClick={() => handleDelete(lead)} style={{
                      width: '100%', padding: '10px 14px', border: 'none', background: 'none',
                      textAlign: 'left', fontSize: '13px', color: BRAND.danger, cursor: 'pointer',
                    }}>🗑 Delete Lead</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CallLogModal
        open={!!logItem} onClose={() => setLogItem(null)}
        item={logItem} type="lead"
        onSave={handleLogCall} currentUser={user}
      />
      <LeadFormModal
        open={addOpen || !!editLead}
        onClose={() => { setAddOpen(false); setEditLead(null) }}
        lead={editLead}
        onSave={handleSaveLead}
      />
    </div>
  )
}
