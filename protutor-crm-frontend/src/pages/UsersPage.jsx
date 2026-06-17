// src/pages/UsersPage.jsx
import { useState } from 'react'
import { UserPlus, Trash2, Pencil } from 'lucide-react'
import { Button, Badge, Avatar, PageHeader, EmptyState } from '../components/ui'
import AddUserModal from '../components/modals/AddUserModal'
import { users as usersApi } from '../lib/api'
import { BRAND } from '../lib/constants'
import { useAuth } from '../lib/AuthContext'

export default function UsersPage({ users, setUsers }) {
  const { user: currentUser } = useAuth()
  const [editingUser, setEditingUser] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(null)  // tracks which row is mid-action

  // Single save handler that dispatches to create or update.
  async function handleSave(form) {
    if (editingUser) {
      const data = await usersApi.update(editingUser.id, form)
      setUsers(prev => prev.map(u => u.id === editingUser.id ? data.user : u))
      setEditingUser(null)
    } else {
      const data = await usersApi.create(form)
      setUsers(prev => [data.user, ...prev])
    }
  }

  async function handleDelete(u) {
    if (u.id === currentUser?.id) {
      alert("You can't delete yourself")
      return
    }
    if (!confirm(`Delete ${u.fname} ${u.lname || ''}? This cannot be undone.`)) return
    setBusy(u.id)
    try {
      await usersApi.delete(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    } finally {
      setBusy(null)
    }
  }

  const totalActive   = users.filter(u => u.status === 'Active').length
  const totalManagers = users.filter(u => u.role === 'manager').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '24px 28px' }}>

      <PageHeader
        title="User Management"
        subtitle="Manage team members and access levels"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus size={13} /> Add Employee
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Employees', value: users.length, color: BRAND.textMain },
          { label: 'Active',          value: totalActive,  color: '#16a34a' },
          { label: 'Managers',        value: totalManagers, color: '#2563eb' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff', border: `1px solid ${BRAND.border}`,
            borderRadius: '12px', padding: '16px 20px',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '12px', color: BRAND.textMuted, marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <EmptyState icon="👥" title="No employees yet" description="Add your first team member." action={<Button onClick={() => setAddOpen(true)}>Add Employee</Button>} />
      ) : (
        <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid #f3f4f6`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: BRAND.textMain }}>Employees</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub, background: '#f3f4f6', padding: '3px 10px', borderRadius: '99px' }}>
              {users.length} users
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Name', 'Mobile', 'Role', 'Status', 'Cities', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', fontSize: '11px', fontWeight: 700,
                    color: BRAND.textMuted, textTransform: 'uppercase',
                    letterSpacing: '0.05em', textAlign: 'left',
                    borderBottom: `1px solid #f0f0f0`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr
                    key={u.id || idx}
                    style={{ borderBottom: idx < users.length - 1 ? `1px solid #f5f5f5` : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={u.fname} size={32} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: BRAND.textMain }}>
                            {u.fname} {u.lname}
                            {isSelf && (
                              <span style={{ fontSize: '11px', color: BRAND.textMuted, fontWeight: 500, marginLeft: '6px' }}>
                                (you)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: BRAND.textMuted }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>
                      {u.mobile || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '13px', color: '#374151', textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge status={u.status}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(u.cities || []).slice(0, 3).map(c => (
                          <span key={c} style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px' }}>{c}</span>
                        ))}
                        {(u.cities || []).length > 3 && (
                          <span style={{ fontSize: '11px', color: BRAND.textMuted }}>+{u.cities.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(u)}
                          disabled={busy === u.id}
                        >
                          <Pencil size={12} /> Edit
                        </Button>
                        {!isSelf && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(u)}
                            disabled={busy === u.id}
                          >
                            <Trash2 size={12} /> {busy === u.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddUserModal
        open={addOpen || !!editingUser}
        onClose={() => { setAddOpen(false); setEditingUser(null) }}
        onSave={handleSave}
        editingUser={editingUser}
      />
    </div>
  )
}
