'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, User, Key, Save } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (newPassword && newPassword !== confirmPassword) { setError('New passwords do not match'); return }
    if (newPassword && newPassword.length < 6) { setError('New password must be at least 6 characters'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Update failed'); return }
      setSuccess('Profile updated successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      router.refresh()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1"><User className="w-5 h-5 text-blue-600" /><h1 className="text-2xl font-bold text-gray-900">Profile</h1></div>
        <p className="text-sm text-gray-500">Update your name and password</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Display name</label>
          <input className="input" placeholder="Leave blank to keep current" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3"><Key className="w-4 h-4 text-gray-400" /><span className="text-sm font-medium text-gray-700">Change password</span></div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Current password</label>
              <input type="password" className="input" placeholder="Required to change password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">New password</label>
              <input type="password" className="input" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
              <input type="password" className="input" placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}
        {success && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">{success}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
        </button>
      </form>
    </div>
  )
}
