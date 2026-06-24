'use client'

import { useState, useRef } from 'react'
import Modal from './ui/Modal'
import { Loader2, Upload, FileText, X, FileUp, Link2, Figma, Sheet, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Report {
  id: string; title: string; fileName: string; fileType: string
  createdAt: string; uploadedBy: { id: string; name: string }
}
interface Props {
  open: boolean; onClose: () => void
  folderId: string; onUploaded: (report: Report) => void
}

type Mode = 'file' | 'link'
type LinkKind = 'FIGMA' | 'GSHEET' | 'LINK'

const LINK_KINDS: { value: LinkKind; label: string; icon: typeof Figma; placeholder: string }[] = [
  { value: 'FIGMA',  label: 'Figma',        icon: Figma, placeholder: 'https://www.figma.com/proto/…' },
  { value: 'GSHEET', label: 'Google Sheet', icon: Sheet, placeholder: 'https://docs.google.com/spreadsheets/…' },
  { value: 'LINK',   label: 'Other link',   icon: Globe, placeholder: 'https://… (Excel online, dashboard, etc.)' },
]

export default function UploadReportModal({ open, onClose, folderId, onUploaded }: Props) {
  const [mode, setMode] = useState<Mode>('file')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [styleable, setStyleable] = useState(false)
  const [linkKind, setLinkKind] = useState<LinkKind>('FIGMA')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() { setTitle(''); setFile(null); setUrl(''); setError(''); setMode('file'); setLinkKind('FIGMA'); setStyleable(false) }
  function handleClose() { reset(); onClose() }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const n = f.name.toLowerCase()
    const ok = n.endsWith('.html') || n.endsWith('.md') || n.endsWith('.xlsx') || n.endsWith('.xls')
    if (!ok) { setError('Only .html, .md, and .xlsx files are supported'); return }
    setFile(f); setError('')
    if (!title) setTitle(f.name.replace(/\.(html|md|xlsx|xls)$/i, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setError(''); setLoading(true)
    try {
      let res: Response
      if (mode === 'file') {
        if (!file) { setError('Please select a file'); setLoading(false); return }
        const fd = new FormData(); fd.append('title', title.trim()); fd.append('file', file)
        if (styleable) fd.append('styleable', 'true')
        res = await fetch(`/api/folders/${folderId}/reports`, { method: 'POST', body: fd })
      } else {
        if (!url.trim()) { setError('Please paste a URL'); setLoading(false); return }
        res = await fetch(`/api/folders/${folderId}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), url: url.trim(), linkKind }),
        })
      }
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onUploaded(data.report); handleClose()
    } catch { setError('Network error') } finally { setLoading(false) }
  }

  const fileTypeLabel = (() => {
    const n = file?.name.toLowerCase() ?? ''
    if (n.endsWith('.md')) return 'Markdown'
    if (n.endsWith('.xlsx') || n.endsWith('.xls')) return 'Excel'
    return 'HTML'
  })()

  return (
    <Modal open={open} onClose={handleClose} title="Add Report" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button type="button" onClick={() => setMode('file')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              mode === 'file' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <FileUp className="w-3.5 h-3.5" /> Upload file
          </button>
          <button type="button" onClick={() => setMode('link')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              mode === 'link' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <Link2 className="w-3.5 h-3.5" /> Add link
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
          <input className="input" placeholder="Report title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>

        {mode === 'file' ? (
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
                  Click to select <span className="text-blue-600 font-medium">.html</span>, <span className="text-blue-600 font-medium">.md</span> or <span className="text-blue-600 font-medium">.xlsx</span>
                </span>
              </button>
            )}
            <input ref={fileRef} type="file" accept=".html,.md,.xlsx,.xls,text/html,text/markdown,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} className="hidden" />

            {/* Styleable toggle — only for HTML files */}
            {file && file.name.toLowerCase().endsWith('.html') && (
              <label className="flex items-center gap-2.5 mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                <input type="checkbox" checked={styleable} onChange={e => setStyleable(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Styleable report</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">Enable theme switching. Only use for reports generated with the style guide class names.</p>
                </div>
              </label>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Link type</label>
              <div className="grid grid-cols-3 gap-2">
                {LINK_KINDS.map(k => (
                  <button key={k.value} type="button" onClick={() => setLinkKind(k.value)}
                    className={cn('flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all',
                      linkKind === k.value ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                    <k.icon className="w-4 h-4" /> {k.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
              <input className="input" placeholder={LINK_KINDS.find(k => k.value === linkKind)?.placeholder}
                value={url} onChange={e => setUrl(e.target.value)} />
              <p className="text-[11px] text-gray-400 mt-1">
                Make sure the link is shared/viewable by anyone with the link so it embeds correctly.
              </p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'file' ? 'Upload' : 'Add link'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
