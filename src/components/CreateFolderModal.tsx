'use client'

import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import { Loader2 } from 'lucide-react'

const TYPES = [
  { value: 'SALES', label: 'Sales' },
  { value: 'SDR',   label: 'SDR'   },
  { value: 'DEV',   label: 'Dev'   },
  { value: 'CUSTOM',label: 'Custom'},
]

interface Folder {
  id: string; name: string; type: string; parentId?: string | null
  _count: { reports: number; children: number }
}

interface Share { shareType: string; roleTarget?: string | null; userId?: string | null }

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (folder: Folder) => void
  initial?: { id: string; name: string; type: string; description?: string }
  parentId?: string
  parentShares?: Share[]
}

export default function CreateFolderModal({ open, onClose, onCreated, initial, parentId, parentShares }: Props) {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'CUSTOM')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setType(initial?.type ?? 'CUSTOM')
      setDescription(initial?.description ?? '')
      setError('')
    }
  }, [open, initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setError(''); setLoading(true)
    try {
      const url = isEdit ? `/api/folders/${initial!.id}` : '/api/folders'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, description, parentId: parentId ?? null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onCreated(data.folder)
    } catch { setError('Network error') } finally { setLoading(false) }
  }

  const title = isEdit ? 'Edit Folder' : parentId ? 'New Subfolder' : 'New Folder'

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {parentId && !isEdit && parentShares && parentShares.length > 0 && (
          <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            This subfolder will inherit the parent folder's access. You can change sharing after creation.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {parentId ? 'Subfolder name' : 'Folder name'}
          </label>
          <input className="input" placeholder={parentId ? 'e.g. January Breakdown' : 'e.g. Q2 Sales Reports'} value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all ${type === t.value ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea className="input resize-none" placeholder="Brief description…" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
