// src/pages/CallDataPage.jsx
import { useState, useMemo } from 'react'
import { Phone, MessageSquare, Plus, MoreVertical } from 'lucide-react'
import { Button, Badge, EmptyState, PageHeader, Modal, Input, Select } from '../components/ui'
import CallLogModal from '../components/modals/CallLogModal'
import { callData as callDataApi } from '../lib/api'
import { BRAND, CITIES, CALL_DATA_CATEGORIES } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'

const EMPTY_FORM = {
  phone: '', countryCode: '91', name: '', city: '',
  category: '', source: '', entryDate: new Date().toISOString().split('T')[0],
}

export default function CallDataPage({ numbers, setNumbers }) {
  const { user } = useAuth()
  const [search, setSearch]     = useState('')
  const [logItem, setLogItem]   = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const filtered = useMemo(() =>
    numbers.filter(n => {
      if (!search) return true
      const q = search.toLowerCase()
      return n.phone?.includes(q) || n.name?.toLowerCase().includes(q)
    }), [numbers, search])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleLogCall(payload) {
    const data = await callDataApi.logCall(logItem.id, payload)
    setNumbers(prev => prev.map(n => n.id === logItem.id ? data.number : n))
  }

  async function handleSave() {
    if (!form.phone) { alert('Phone number is required'); return }
    setSaving(true)
    try {
      const data = await callDataApi.create(form)
      setNumbers(prev => [data.number, ...prev])
      setForm(EMPTY_FORM)
      setFormOpen(false)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Delete number ${item.phone}?`)) return
    try {
      await callDataApi.delete(item.id)
      setNumbers(prev => prev.filter(n => n.id !== item.id))
    } catch (err) { alert(err.message) }
    setMenuOpen(null)
  }

  async function handleMsg(item) {
    try {
      const data = await callDataApi.sendMsg(item.id)
      setNumbers(prev => prev.map(n => n.id === item.id ? data.number : n))
    } catch (err) { alert(err.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '24px 28px' }}>
      <PageHeader
        title="Call Data"
        subtitle="Manage inbound numbers and call history"
        actions={<Button onClick={() => setFormOpen(true)}><Plus size={13} /> Add Number</Button>}
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or number..."
          style={{ border: `1px solid ${BRAND.border}`, borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none', width: '220px' }}
        />
        <span style={{ fontSize: '13px', color: BRAND.textSub }}>{filtered.length} numbers</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📞" title="No numbers yet" description="Add your first call data entry." action={<Button onClick={() => setFormOpen(true)}>Add Number</Button>} />
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${BRAND.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 130px 120px', padding: '10px 16px', background: '#fafafa', borderBottom: `1px solid ${BRAND.border}` }}>
            {['CONTACT', 'CATEGORY', 'STATUS', 'FOLLOW-UP', 'ACTIONS'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textMuted, letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {filtered.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 100px 130px 120px',
                padding: '13px 16px', borderBottom: idx < filtered.length - 1 ? `1px solid ${BRAND.bg}` : 'none',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={13} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: BRAND.textMain }}>{item.name || item.phone}</div>
                  <div style={{ fontSize: '12px', color: BRAND.textMuted }}>📞 {item.phone}</div>
                  <div style={{ fontSize: '11px', color: BRAND.textMuted }}>Entry: {item.entryDate}</div>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: BRAND.textSub }}>
                {item.category || '—'}
                {item.city && <div style={{ fontSize: '11px', color: BRAND.textMuted }}>📍 {item.city}</div>}
              </div>

              <div>
                <Badge status={item.status}>{item.status === 'open' ? 'Open' : 'Closed'}</Badge>
                <div style={{ fontSize: '11px', color: BRAND.textMuted, marginTop: '4px' }}>
                  {item.callLogs?.length || 0} calls
                </div>
              </div>

              <div style={{ fontSize: '12px', color: BRAND.textSub }}>
                {item.followupDate ? item.followupDate.split('T')[0] : 'No follow-up'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <Button size="sm" onClick={() => setLogItem(item)}><Phone size={12} /> Log</Button>
                <button onClick={() => handleMsg(item)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: BRAND.textSub }}>
                  <MessageSquare size={13} />
                </button>
                <button onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: BRAND.textSub }}>
                  <MoreVertical size={14} />
                </button>
                {menuOpen === item.id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: '140px' }}>
                    <button onClick={() => handleDelete(item)} style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: '13px', color: BRAND.danger, cursor: 'pointer' }}>🗑 Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Number Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Number">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input label="Phone *" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
          <Input label="Name" value={form.name} onChange={set('name')} placeholder="Contact name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select label="City" value={form.city} onChange={set('city')} options={CITIES} placeholder="Select city" />
            <Select label="Category" value={form.category} onChange={set('category')} options={CALL_DATA_CATEGORIES} placeholder="Select category" />
          </div>
          <Input label="Source" value={form.source} onChange={set('source')} placeholder="Source" />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Number'}</Button>
          </div>
        </div>
      </Modal>

      <CallLogModal open={!!logItem} onClose={() => setLogItem(null)} item={logItem} type="call-data" onSave={handleLogCall} currentUser={user} />
    </div>
  )
}
