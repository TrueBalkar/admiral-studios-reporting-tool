'use client'

import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import { RoleBadge } from './ui/Badge'
import { Loader2, Trash2, UserPlus, Users } from 'lucide-react'

type ShareType = 'ROLE' | 'USER'
const ALL_ROLES = ['ADMIN', 'SALES', 'SDR', 'DEV']

interface Share {
  id: string
  shareType: ShareType
  roleTarget?: string | null
  userId?: string | null
  user?: { id: string; name: string; email: string } | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Props {
  open: boolean
  onClose: () => void
  folderId: string
  folderName: string
}

export default function ShareModal({ open, onClose, folderId, folderName }: Props) {
  const [shares, setShares] = useState<Share[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tab, setTab] = useState<'role' | 'user'>('role')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetch(`/api/folders/${folderId}/share`).then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ])
      .then(([s, u]) => {
        setShares(s.shares || [])
        setUsers(u.users || [])
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [open, folderId])

  async function addShare() {
    setSaving(true)
    setError('')
    try {
      const body =
        tab === 'role'
          ? { shareType: 'ROLE', roleTarget: selectedRole }
          : { shareType: 'USER', userId: selectedUser }

      const res = await fetch(`/api/folders/${folderId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setShares(data.shares)
      setSelectedRole('')
      setSelectedUser('')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function removeShare(shareId: string) {
    setRemovingId(shareId)
    try {
      await fetch(`/api/folders/${folderId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      })
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } catch {
      setError('Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const sharedRoles = shares.filter((s) => s.shareType === 'ROLE').map((s) => s.roleTarget)
  const sharedUserIds = shares.filter((s) => s.shareType === 'USER').map((s) => s.userId)

  return (
    <Modal open={open} onClose={onClose} title={`Share "${folderName}"`} size="md">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Add share section */}
          <div>
            <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTab('role')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'role' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Share with role
              </button>
              <button
                onClick={() => setTab('user')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'user' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Share with user
              </button>
            </div>

            {tab === 'role' ? (
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="">Select role…</option>
                  {ALL_ROLES.filter((r) => !sharedRoles.includes(r)).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  onClick={addShare}
                  disabled={!selectedRole || saving}
                  className="btn-primary px-4"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Select user…</option>
                  {users.filter((u) => !sharedUserIds.includes(u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <button
                  onClick={addShare}
                  disabled={!selectedUser || saving}
                  className="btn-primary px-4"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
          )}

          {/* Current shares */}
          {shares.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current access</p>
              <div className="space-y-1.5">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    {share.shareType === 'ROLE' ? (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">All</span>
                        <RoleBadge role={share.roleTarget!} />
                        <span className="text-sm text-gray-500">users</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                          {share.user?.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{share.user?.name}</span>
                        <span className="text-xs text-gray-400">{share.user?.email}</span>
                      </div>
                    )}
                    <button
                      onClick={() => removeShare(share.id)}
                      disabled={removingId === share.id}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      {removingId === share.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shares.length === 0 && !loading && (
            <p className="text-sm text-gray-400 text-center py-2">No shares yet. Only the creator and admins have access.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
