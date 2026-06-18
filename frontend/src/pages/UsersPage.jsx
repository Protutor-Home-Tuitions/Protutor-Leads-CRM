import { useState, useCallback } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AddUserModal } from '../components/modals/AddUserModal';
import { EditUserModal } from '../components/modals/EditUserModal';
import { UserPlus } from 'lucide-react';
import { createUser, updateUser, deleteUser } from '../lib/api';

export function UsersPage({ users, setUsers, currentUser }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const onAdd = useCallback(
    async (form) => {
      try {
        const created = await createUser(form);
        if (created) {
          setUsers((cur) => [...cur, created]);
        } else {
          setUsers((cur) => [...cur, { id: Date.now(), ...form }]);
        }
      } catch (e) {
        alert('Failed to add: ' + e.message);
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
      } catch (e) {
        alert('Failed to update: ' + e.message);
      }
    },
    [editing, setUsers]
  );

  const onDelete = useCallback(
    async (user) => {
      if (!window.confirm(`Delete ${user.name}?`)) return;
      try {
        await deleteUser(user.id);
        setUsers((cur) => cur.filter((u) => u.id !== user.id));
      } catch (e) {
        alert('Failed to delete: ' + e.message);
      }
    },
    [setUsers]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900">User Management</h2>
          <p className="text-xs text-slate-400">Manage team members and access levels</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Employee
        </Button>
      </div>

      <div className="p-5 flex-shrink-0">
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total Employees', value: users.length, color: 'text-slate-900' },
            { label: 'Active', value: users.filter((u) => u.status === 'Active').length, color: 'text-green-600' },
            { label: 'Managers', value: users.filter((u) => u.role === 'manager').length, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pb-5 overflow-hidden">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-bold text-slate-900">Employees</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {users.length} users
            </span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Mobile</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Cities</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {u.name}
                              {isMe && <span className="text-xs text-slate-400 font-normal ml-1.5">(you)</span>}
                            </div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{u.mobile}</td>
                      <td className="px-4 py-3 capitalize text-sm text-slate-700">{u.role}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.status === 'Active' ? 'active' : 'default'}>{u.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(u.cities || []).slice(0, 3).map((c) => (
                            <span key={c} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                          {(u.cities || []).length > 3 && (
                            <span className="text-xs text-slate-400">+{u.cities.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-500"
                            onClick={() => setEditing(u)}
                          >
                            ✏️ Edit
                          </Button>
                          {!isMe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 hover:bg-red-50"
                              onClick={() => onDelete(u)}
                            >
                              🗑 Delete
                            </Button>
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
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onSave={onAdd} />
      <EditUserModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={onEdit}
        user={editing}
      />
    </div>
  );
}
