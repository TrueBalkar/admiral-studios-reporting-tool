'use client'

import { useState, useRef } from 'react'
import Modal from './ui/Modal'
import { Loader2, Upload, FileText, X } from 'lucide-react'

interface Report {
  id: string; title: string; fileName: string; fileType: string
  createdAt: string; uploadedBy: { id: string; name: string }
}

interface Props {
  open: boolean; onClose: () => void
  folderId: string; onUploaded: (report: Report) => void
}

export default function UploadReportModal({ open, onClose, folderId, onUploaded }: Props) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() { setTitle(''); setFile(null); setError('') }
  function handleClose() { reset(); onClose() }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const isHtml = f.name.toLowerCase().endsWith('.html') || f.type === 'text/html'
    const isMd   = f.name.toLowerCase().endsWith('.md')   || f.type === 'text/markdown'
    if (!isHtml && !isMd) { setError('Only .html and .md files are supported'); return }
    setFile(f); setError('')
    if (!title) setTitle(f.name.replace(/\.(html|md)$/i, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!file) { setError('Please select a file'); return }
    setError(''); setLoading(true)
    try {
      const fd = new FormData(); fd.append('title', title.trim()); fd.append('file', file)
      const res = await fetch(`/api/folders/${folderId}/reports`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Upload failed'); return }
      onUploaded(data.report); handleClose()
    } catch { setError('Network error') } finally { setLoading(false) }
  }

  const fileTypeLabel = file?.name.toLowerCase().endsWith('.md') ? 'MD' : 'HTML'

  return (
    <Modal open={open} onClose={handleClose} title="Upload Report" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
          <input className="input" placeholder="Report title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">File</label>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{fileTypeLabel} · {(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-500">
                Click to select <span className="text-blue-600 font-medium">.html</span> or <span className="text-blue-600 font-medium">.md</span> file
              </span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".html,.md,text/html,text/markdown" onChange={handleFile} className="hidden" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Upload
          </button>
        </div>
      </form>
    </Modal>
  )
}
