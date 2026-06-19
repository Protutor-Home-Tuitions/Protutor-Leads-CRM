import { useState, useCallback } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddUserModal } from '../components/modals/AddUserModal';
import { EditUserModal } from '../components/modals/EditUserModal';
import { UserPlus, Pen, Trash2 } from 'lucide-react';
import { createUser, updateUser, deleteUser } from '../lib/api';

export function UsersPage({ users, setUsers, currentUser }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const onAdd = useCallback(
    async (form) => {
      try {
        const created = await createUser(form);
        setUsers((cur) => [...cur, created || form]);
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    [setUsers]
  );

  const onEdit = useCallback(
    async (form) => {
      if (!editing) return;
      try {
        const updated = await updateUser(editing.id, form);
        setUsers((cur) => cur.map((u) => (u.id === editing.id ? { ...u, ...(updated || form) } : u)));
        setEditing(null);
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    [editing, setUsers]
  );

  const onDelete = useCallback(
    async (user) => {
      const displayName = user.fname || user.name || user.email;
      if (!confirm(`Are you sure you want to delete "${displayName}"?`)) return;
      if (!confirm(`FINAL CONFIRMATION: Deleting "${displayName}" is permanent and cannot be undone. Proceed?`)) return;
      try {
        await deleteUser(user.id);
        setUsers((cur) => cur.filter((u) => u.id !== user.id));
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    [setUsers]
  );

  const stats = [
    { label: 'Total Employees', value: users.length, color: '#111827' },
    { label: 'Active', value: users.filter((u) => u.status === 'Active').length, color: '#16a34a' },
    { label: 'Managers', value: users.filter((u) => u.role === 'manager').length, color: '#2563eb' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f6fa', overflowY: 'auto' }}>
      <div style={{ padding: '24px 32px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>User Management</h1>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>Manage team members and access levels</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ margin: '0 32px 32px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Employees</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: '99px' }}>
            {users.length} users
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Name', 'Mobile', 'Role', 'Status', 'Cities', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const isMe = currentUser && (u.id === currentUser.id || u.email === currentUser.email);
                return (
                  <tr
                    key={u.id || idx}
                    style={{ borderBottom: idx < users.length - 1 ? '1px solid #f5f5f5' : 'none' }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = '#fafbff'; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {(u.fname || u.name)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            {u.fname || u.name}
                            {isMe && <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400, marginLeft: '6px' }}>(you)</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>{u.mobile || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '13px', color: '#374151', textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={u.status === 'Active' ? 'active' : 'default'}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(u.cities || []).slice(0, 3).map((c) => (
                          <span key={c} style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px' }}>{c}</span>
                        ))}
                        {(u.cities || []).length > 3 && (
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>+{u.cities.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setEditing(u)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                          onMouseEnter={(ev) => { ev.currentTarget.style.background = '#f3f4f6'; }}
                          onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                        >
                          <Pen size={12} /> Edit
                        </button>
                        {!isMe && (
                          <button
                            type="button"
                            onClick={() => onDelete(u)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                            onMouseEnter={(ev) => { ev.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onSave={onAdd} />
      <EditUserModal open={!!editing} onClose={() => setEditing(null)} onSave={onEdit} user={editing} />
    </div>
  );
}
