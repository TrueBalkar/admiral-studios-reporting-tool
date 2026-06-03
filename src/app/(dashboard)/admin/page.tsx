'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2, Loader2, ShieldCheck, Plus, Check, Pencil, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { RoleBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { formatDate } from '@/lib/utils'

interface User { id: string; name: string; email: string; role: string; createdAt: string }
interface Role { id: string; name: string; isBuiltIn: boolean; isDefault: boolean }

export default function AdminPage() {
  const router = useRouter()
  const confirm = useConfirm()
  const [tab, setTab] = useState<'users' | 'roles' | 'audit'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)

  // User form state
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'SALES' })
  const [userFormError, setUserFormError] = useState('')
  const [userFormLoading, setUserFormLoading] = useState(false)

  // Audit state
  const [auditItems, setAuditItems] = useState<{ id: string; userName: string; action: string; targetName: string | null; folderName: string | null; createdAt: string }[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditPages, setAuditPages] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)

  // Role form state
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [roleFormError, setRoleFormError] = useState('')
  const [roleFormLoading, setRoleFormLoading] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editRoleName, setEditRoleName] = useState('')
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/roles').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([u, r, me]) => {
      if (me.user?.role !== 'ADMIN') { router.push('/dashboard'); return }
      setUsers(u.users || [])
      setRoles(r.roles || [])
      setCurrentUserId(me.user.userId)
    }).finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (tab !== 'audit') return
    setAuditLoading(true)
    fetch(`/api/admin/audit?page=${auditPage}&limit=50`).then(r => r.json()).then(d => {
      setAuditItems(d.items || []); setAuditPages(d.pages || 1)
    }).finally(() => setAuditLoading(false))
  }, [tab, auditPage])

  function downloadAudit() { window.open('/api/admin/audit?csv=true', '_blank') }

  // --- Users ---
  async function createUser(e: React.FormEvent) {
    e.preventDefault(); setUserFormError(''); setUserFormLoading(true)
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) })
      const data = await res.json()
      if (!res.ok) { setUserFormError(data.error || 'Failed'); return }
      setUsers(p => [...p, data.user]); setShowCreateUser(false)
      setUserForm({ name: '', email: '', password: '', role: 'SALES' })
    } catch { setUserFormError('Network error') } finally { setUserFormLoading(false) }
  }

  async function deleteUser(userId: string) {
    const ok = await confirm({ title: 'Delete user?', message: 'This user and their pinned folders will be removed. Folders and reports they created remain.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    setDeletingUserId(userId)
    const res = await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    if (res.ok) setUsers(p => p.filter(u => u.id !== userId))
    setDeletingUserId(null)
  }

  async function changeUserRole(userId: string, role: string) {
    setUpdatingRoleId(userId)
    const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    const data = await res.json()
    if (res.ok) setUsers(p => p.map(u => u.id === userId ? { ...u, role: data.user.role } : u))
    else alert(data.error || 'Failed')
    setUpdatingRoleId(null)
  }

  // --- Roles ---
  async function createRole(e: React.FormEvent) {
    e.preventDefault(); setRoleFormError(''); setRoleFormLoading(true)
    try {
      const res = await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newRoleName }) })
      const data = await res.json()
      if (!res.ok) { setRoleFormError(data.error || 'Failed'); return }
      setRoles(p => [...p, data.role]); setShowCreateRole(false); setNewRoleName('')
    } catch { setRoleFormError('Network error') } finally { setRoleFormLoading(false) }
  }

  async function saveRole(roleId: string, updates: { name?: string; isDefault?: boolean }) {
    const res = await fetch(`/api/roles/${roleId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
    const data = await res.json()
    if (res.ok) {
      setRoles(p => p.map(r => {
        if (updates.isDefault) return { ...r, isDefault: r.id === roleId }
        return r.id === roleId ? { ...r, ...data.role } : r
      }))
    } else alert(data.error || 'Failed')
  }

  async function deleteRole(roleId: string, roleName: string) {
    const affected = users.filter(u => u.role === roleName).length
    const defaultRole = roles.find(r => r.isDefault)
    const ok = await confirm({
      title: `Delete role "${roleName}"?`,
      message: affected > 0 ? `${affected} user(s) will be reset to "${defaultRole?.name ?? 'default'}".` : 'No users currently have this role.',
      confirmLabel: 'Delete', danger: true,
    })
    if (!ok) return
    setDeletingRoleId(roleId)
    const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setRoles(p => p.filter(r => r.id !== roleId))
      if (affected > 0) setUsers(p => p.map(u => u.role === roleName ? { ...u, role: data.resetTo } : u))
    } else alert(data.error || 'Failed')
    setDeletingRoleId(null)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-5 h-5 text-blue-600" /><h1 className="text-2xl font-bold text-gray-900">Admin</h1></div>
          <p className="text-sm text-gray-500">Manage users, roles, and access</p>
        </div>
        {tab === 'audit'
          ? <button onClick={downloadAudit} className="btn-secondary"><Download className="w-4 h-4" /> Export CSV</button>
          : <button onClick={() => tab === 'users' ? setShowCreateUser(true) : setShowCreateRole(true)} className="btn-primary">
              {tab === 'users' ? <><UserPlus className="w-4 h-4" /> Add User</> : <><Plus className="w-4 h-4" /> New Role</>}
            </button>
        }
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {(['users', 'roles', 'audit'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'users' ? `Users (${users.length})` : t === 'roles' ? `Roles (${roles.length})` : 'Audit Log'}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{user.name.charAt(0).toUpperCase()}</div>
                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      {user.id === currentUserId && <span className="text-xs text-gray-400">(you)</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{user.email}</td>
                  <td className="px-5 py-3.5">
                    {user.id === currentUserId ? (
                      <RoleBadge role={user.role} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          onChange={e => changeUserRole(user.id, e.target.value)}
                          disabled={updatingRoleId === user.id}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                        {updatingRoleId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {user.id !== currentUserId && (
                      <button onClick={() => deleteUser(user.id)} disabled={deletingUserId === user.id} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                        {deletingUserId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Roles tab */}
      {tab === 'roles' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Users</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Flags</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roles.map(role => {
                const userCount = users.filter(u => u.role === role.name).length
                return (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      {editingRole?.id === role.id ? (
                        <div className="flex items-center gap-2">
                          <input className="input py-1 text-sm w-32" value={editRoleName} onChange={e => setEditRoleName(e.target.value)} autoFocus />
                          <button onClick={async () => { await saveRole(role.id, { name: editRoleName }); setRoles(p => p.map(r => r.id === role.id ? { ...r, name: editRoleName } : r)); setEditingRole(null) }} className="btn-primary py-1 px-2 text-xs"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingRole(null)} className="btn-secondary py-1 px-2 text-xs"><span className="text-xs">✕</span></button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-900 font-mono">{role.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{userCount}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {role.isBuiltIn && <span className="badge bg-gray-100 text-gray-600">Built-in</span>}
                        {role.isDefault && <span className="badge bg-emerald-100 text-emerald-700">Default</span>}
                        {!role.isBuiltIn && !role.isDefault && (
                          <button onClick={() => saveRole(role.id, { isDefault: true })} className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">Set default</button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {!role.isBuiltIn && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingRole(role); setEditRoleName(role.name) }} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteRole(role.id, role.name)} disabled={deletingRoleId === role.id} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                            {deletingRoleId === role.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log tab */}
      {tab === 'audit' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Folder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLoading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : auditItems.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No activity yet</td></tr>
              ) : auditItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{item.userName}</td>
                  <td className="px-5 py-3 text-xs text-gray-600 font-mono">{item.action}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{item.targetName ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{item.folderName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Page {auditPage} of {auditPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="btn-secondary p-1.5 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setAuditPage(p => Math.min(auditPages, p + 1))} disabled={auditPage === auditPages} className="btn-secondary p-1.5 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Add User" size="sm">
        <form onSubmit={createUser} className="space-y-4">
          {['name', 'email', 'password'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">{field}</label>
              <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} className="input"
                placeholder={field === 'email' ? 'user@company.com' : field === 'password' ? '••••••••' : 'Full name'}
                value={(userForm as Record<string, string>)[field]}
                onChange={e => setUserForm(p => ({ ...p, [field]: e.target.value }))} required />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select className="input" value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          {userFormError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{userFormError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={userFormLoading}>{userFormLoading && <Loader2 className="w-4 h-4 animate-spin" />} Create</button>
          </div>
        </form>
      </Modal>

      {/* Create Role Modal */}
      <Modal open={showCreateRole} onClose={() => setShowCreateRole(false)} title="New Role" size="sm">
        <form onSubmit={createRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role name</label>
            <input className="input uppercase" placeholder="e.g. MANAGER" value={newRoleName}
              onChange={e => setNewRoleName(e.target.value.toUpperCase())} autoFocus />
            <p className="text-xs text-gray-400 mt-1">Role names are uppercase by convention</p>
          </div>
          {roleFormError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{roleFormError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowCreateRole(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={roleFormLoading}>{roleFormLoading && <Loader2 className="w-4 h-4 animate-spin" />} Create</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
