'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload, Share2, Trash2, Edit2, FileText, MoreVertical, Loader2,
  Calendar, User, ArrowLeft, FolderOpen, Plus, Search, SortAsc,
  Filter, CheckSquare, Square, MoveRight, Palette, X,
  Tag, ChevronRight,
} from 'lucide-react'
import { FolderTypeBadge } from '@/components/ui/Badge'
import { ReportIconTile } from '@/components/ui/ReportIcon'
import UploadReportModal from '@/components/UploadReportModal'
import ShareModal from '@/components/ShareModal'
import CreateFolderModal from '@/components/CreateFolderModal'
import { formatDate, cn } from '@/lib/utils'
import { useConfirm } from '@/components/ui/ConfirmProvider'

interface Report {
  id: string; title: string; fileName: string; fileType: string
  tags: string; createdAt: string
  uploadedBy: { id: string; name: string }
}
interface Child {
  id: string; name: string; type: string; color?: string | null
  _count: { reports: number; children: number }
}
interface Folder {
  id: string; name: string; type: string; description: string | null; color?: string | null
  createdById: string; parentId: string | null
  parent?: { id: string; name: string; color?: string | null } | null
  createdBy: { id: string; name: string; email: string }
  shares: { id: string; shareType: string; roleTarget?: string | null; userId?: string | null }[]
  _count: { reports: number; children: number }
  children: Child[]
}
interface CurrentUser { userId: string; role: string; name: string }
type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'
type FilterType = 'ALL' | 'HTML' | 'MD'

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6b7280']

export default function FolderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const confirm = useConfirm()
  const [folder, setFolder] = useState<Folder | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showSubfolder, setShowSubfolder] = useState(false)
  const [deletingReport, setDeletingReport] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [filter, setFilter] = useState<FilterType>('ALL')
  // Drag & drop
  const [dragging, setDragging] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [allFolders, setAllFolders] = useState<{ id: string; name: string }[]>([])
  // Color
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [savingColor, setSavingColor] = useState(false)
  // Report quick actions
  const [reportMenu, setReportMenu] = useState<string | null>(null)
  const [subfolderShareId, setSubfolderShareId] = useState<string | null>(null)
  const [subfolderEditId, setSubfolderEditId] = useState<string | null>(null)
  const [subfolderMenu, setSubfolderMenu] = useState<string | null>(null)
  // Tag editing
  const [tagEditId, setTagEditId] = useState<string | null>(null)
  const [tagEditValue, setTagEditValue] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [savingTags, setSavingTags] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [fr, rr, mr] = await Promise.all([
        fetch(`/api/folders/${id}`),
        fetch(`/api/folders/${id}/reports`),
        fetch('/api/auth/me'),
      ])
      if (!fr.ok) { setError('Folder not found or access denied'); return }
      const [fd, rd, md] = await Promise.all([fr.json(), rr.json(), mr.json()])
      setFolder(fd.folder); setReports(rd.reports || []); setCurrentUser(md.user)
    } catch { setError('Failed to load folder') } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    fetch('/api/folders').then(r => r.json()).then(d =>
      setAllFolders((d.folders || []).filter((f: { id: string }) => f.id !== id))
    )
  }, [id])

  // Drag & drop
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function onDragLeave(e: React.DragEvent) {
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setDragging(false)
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]; if (!file) return
    const isHtml = file.name.toLowerCase().endsWith('.html')
    const isMd = file.name.toLowerCase().endsWith('.md')
    if (!isHtml && !isMd) { alert('Only .html and .md files are supported'); return }
    const title = file.name.replace(/\.(html|md)$/i, '')
    const fd = new FormData(); fd.append('title', title); fd.append('file', file)
    const res = await fetch(`/api/folders/${id}/reports`, { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) setReports(p => [data.report, ...p])
  }

  async function deleteFolder() {
    const ok = await confirm({ title: 'Delete folder?', message: 'This folder and all its reports and subfolders will be permanently deleted.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await fetch(`/api/folders/${id}`, { method: 'DELETE' })
    window.dispatchEvent(new CustomEvent('folders-updated'))
    router.push('/dashboard')
    setMenuOpen(false)
  }

  async function deleteReport(reportId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    const ok = await confirm({ title: 'Delete report?', message: 'This report will be permanently deleted.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    setDeletingReport(reportId)
    const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' })
    if (res.ok) setReports(p => p.filter(r => r.id !== reportId))
    setDeletingReport(null); setReportMenu(null)
  }

  async function deleteSubfolder(childId: string) {
    setSubfolderMenu(null)
    const ok = await confirm({ title: 'Delete subfolder?', message: 'This subfolder and all its reports will be permanently deleted.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await fetch(`/api/folders/${childId}`, { method: 'DELETE' })
    setFolder(p => p ? { ...p, children: p.children.filter(c => c.id !== childId) } : p)
    window.dispatchEvent(new CustomEvent('folders-updated'))
    setSubfolderMenu(null)
  }

  function toggleSelect(rid: string) {
    setSelected(p => { const n = new Set(p); n.has(rid) ? n.delete(rid) : n.add(rid); return n })
  }
  function clearSelection() { setSelected(new Set()); setBulkMode(false) }

  async function bulkDelete() {
    const ok = await confirm({ title: `Delete ${selected.size} report${selected.size !== 1 ? 's' : ''}?`, message: 'The selected reports will be permanently deleted.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    setBulkDeleting(true)
    await fetch('/api/reports/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', reportIds: Array.from(selected) }),
    })
    setReports(p => p.filter(r => !selected.has(r.id))); clearSelection()
    setBulkDeleting(false)
  }

  async function bulkMove(targetFolderId: string) {
    await fetch('/api/reports/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', reportIds: Array.from(selected), targetFolderId }),
    })
    setReports(p => p.filter(r => !selected.has(r.id))); clearSelection(); setShowMoveModal(false)
  }

  async function setColor(color: string | null) {
    setSavingColor(true)
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    })
    const data = await res.json()
    if (res.ok) setFolder(p => p ? { ...p, color: data.folder.color } : p)
    setSavingColor(false); setShowColorPicker(false)
  }

  function openTagEdit(report: Report) {
    setTagEditId(report.id)
    setTagEditValue(report.tags ? report.tags.split(',').filter(Boolean) : [])
    setNewTag(''); setReportMenu(null)
  }

  async function saveTagEdit() {
    if (!tagEditId) return
    setSavingTags(true)
    await fetch(`/api/reports/${tagEditId}/tags`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagEditValue }),
    })
    setReports(p => p.map(r => r.id === tagEditId ? { ...r, tags: tagEditValue.join(',') } : r))
    setSavingTags(false); setTagEditId(null)
  }

  function addTag() {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || tagEditValue.includes(t)) { setNewTag(''); return }
    setTagEditValue(p => [...p, t]); setNewTag('')
  }

  const canManage = currentUser && (currentUser.role === 'ADMIN' || folder?.createdById === currentUser.userId)

  const visibleReports = reports
    .filter(r => filter === 'ALL' || r.fileType === filter)
    .filter(r => !search.trim() || r.title.toLowerCase().includes(search.toLowerCase()) || r.fileName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'date_asc')  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sort === 'name_asc')  return a.title.localeCompare(b.title)
      return b.title.localeCompare(a.title)
    })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )
  if (error || !folder) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-gray-500">{error || 'Folder not found'}</p>
      <Link href="/dashboard" className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Go home</Link>
    </div>
  )

  return (
    <div className="p-8" ref={dropRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-blue-500/10 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 text-center">
            <Upload className="w-10 h-10 text-blue-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Drop to upload</p>
            <p className="text-sm text-gray-500">.html or .md files</p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
        <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
        {folder.parent && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/folders/${folder.parent.id}`} className="hover:text-gray-600">{folder.parent.name}</Link>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">{folder.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            {folder.color && <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: folder.color }} />}
            <h1 className="text-2xl font-bold text-gray-900 truncate">{folder.name}</h1>
            <FolderTypeBadge type={folder.type} />
          </div>
          {folder.description && <p className="text-sm text-gray-500 mt-0.5">{folder.description}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Created by {folder.createdBy.name} · {reports.length} report{reports.length !== 1 ? 's' : ''}
            {folder.children.length > 0 && ` · ${folder.children.length} subfolder${folder.children.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button onClick={() => setShowUpload(true)} className="btn-primary"><Upload className="w-4 h-4" /> Upload</button>
          {canManage && (
            <>
              <button onClick={() => setShowSubfolder(true)} className="btn-secondary"><Plus className="w-4 h-4" /> Subfolder</button>
              <button onClick={() => setShowShare(true)} className="btn-secondary"><Share2 className="w-4 h-4" /> Share</button>
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)} className="btn-secondary p-2"><MoreVertical className="w-4 h-4" /></button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                      <button onClick={() => { setShowEdit(true); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Edit2 className="w-3.5 h-3.5" /> Edit folder
                      </button>
                      <button onClick={() => { setShowColorPicker(true); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Palette className="w-3.5 h-3.5" /> Folder color
                      </button>
                      <button onClick={() => { setBulkMode(v => !v); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <CheckSquare className="w-3.5 h-3.5" /> Bulk select
                      </button>
                      <button onClick={deleteFolder} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete folder
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm inline-flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Folder color</span>
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                className={cn('w-6 h-6 rounded-full hover:scale-110 transition-transform border-2', folder.color === c ? 'border-gray-800' : 'border-transparent')} />
            ))}
            <button onClick={() => setColor(null)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center" title="Remove color">
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>
          {savingColor && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          <button onClick={() => setShowColorPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-700">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set(visibleReports.map(r => r.id)))} className="text-xs text-blue-600 hover:text-blue-800">
            Select all ({visibleReports.length})
          </button>
          {selected.size > 0 && (
            <>
              <button onClick={bulkDelete} disabled={bulkDeleting} className="btn-danger text-xs py-1 px-3">
                {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
              </button>
              <button onClick={() => setShowMoveModal(true)} className="btn-secondary text-xs py-1 px-3">
                <MoveRight className="w-3.5 h-3.5" /> Move to…
              </button>
            </>
          )}
          <button onClick={clearSelection} className="ml-auto text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      )}

      {/* Search/filter/sort — above subfolders */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)} className="input pl-8" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {(['ALL', 'HTML', 'MD'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                filter === f ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              )}>{f}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <SortAsc className="w-3.5 h-3.5 text-gray-400" />
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="input py-1 text-xs w-auto">
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
        </div>
      </div>

      {/* Subfolders */}
      {folder.children.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Subfolders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {folder.children.map(child => (
              <div key={child.id} className="card group hover:shadow-md transition-shadow relative">
                <Link href={`/folders/${child.id}`} className="flex items-center gap-3 p-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    style={child.color ? { background: `${child.color}22` } : undefined}
                  >
                    <FolderOpen
                      className={cn('w-5 h-5', !child.color && 'text-gray-400 group-hover:text-blue-500')}
                      style={child.color ? { color: child.color } : undefined}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600">{child.name}</p>
                    <p className="text-xs text-gray-400">{child._count.reports} report{child._count.reports !== 1 ? 's' : ''}</p>
                  </div>
                </Link>

                {/* Subfolder quick actions */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={e => { e.stopPropagation(); setSubfolderMenu(subfolderMenu === child.id ? null : child.id) }}
                    className="p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {subfolderMenu === child.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSubfolderMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                        <button onClick={() => { setSubfolderShareId(child.id); setSubfolderMenu(null) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Share2 className="w-3.5 h-3.5" /> Manage access
                        </button>
                        <button onClick={() => { setSubfolderEditId(child.id); setSubfolderMenu(null) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => deleteSubfolder(child.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports grid */}
      {visibleReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-700 mb-1">
            {reports.length === 0 ? 'No reports yet' : 'No matching reports'}
          </h3>
          {reports.length === 0 && (
            <p className="text-sm text-gray-400 mb-3">Drop an HTML or MD file here, or click Upload</p>
          )}
          {reports.length === 0 && (
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              <Upload className="w-4 h-4" /> Upload Report
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleReports.map(report => {
            const tags = report.tags ? report.tags.split(',').filter(Boolean) : []
            return (
              <div
                key={report.id}
                className={cn('card group hover:shadow-md transition-shadow', bulkMode && selected.has(report.id) && 'ring-2 ring-blue-400')}
              >
                {bulkMode && (
                  <div className="px-5 pt-3 pb-1 cursor-pointer" onClick={() => toggleSelect(report.id)}>
                    {selected.has(report.id)
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                )}

                <Link href={`/folders/${id}/reports/${report.id}`} className={cn('block p-5 pb-3', bulkMode && 'pointer-events-none')}>
                  <div className="flex items-start gap-3">
                    <ReportIconTile type={report.fileType} className="w-9 h-9" />
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors truncate">
                        {report.title}
                      </h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{report.fileName}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full border border-blue-100">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                <div className="px-5 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(report.createdAt)}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.uploadedBy.name}</span>
                  </div>

                  {!bulkMode && (
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setReportMenu(reportMenu === report.id ? null : report.id) }}
                        className="p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {reportMenu === report.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setReportMenu(null)} />
                          <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                            <button onClick={() => openTagEdit(report)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Tag className="w-3.5 h-3.5" /> Edit tags
                            </button>
                            <button onClick={() => { setSelected(new Set([report.id])); setShowMoveModal(true); setReportMenu(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <MoveRight className="w-3.5 h-3.5" /> Move to…
                            </button>
                            {(currentUser?.role === 'ADMIN' || report.uploadedBy.id === currentUser?.userId || folder.createdById === currentUser?.userId) && (
                              <button onClick={e => deleteReport(report.id, e)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                {deletingReport === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tag edit modal */}
      {tagEditId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setTagEditId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10">
            <h3 className="font-semibold text-gray-900 mb-3">Edit tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-8">
              {tagEditValue.length === 0 && <p className="text-xs text-gray-400">No tags yet</p>}
              {tagEditValue.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                  #{t}
                  <button onClick={() => setTagEditValue(p => p.filter(x => x !== t))} className="hover:text-red-500">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input className="input text-xs flex-1" placeholder="Add tag…" value={newTag}
                onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
              <button onClick={addTag} className="btn-secondary px-3 text-xs">Add</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTagEditId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveTagEdit} disabled={savingTags} className="btn-primary flex-1">
                {savingTags ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMoveModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10">
            <h3 className="font-semibold text-gray-900 mb-3">Move {selected.size} report(s) to…</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {allFolders.map(f => (
                <button key={f.id} onClick={() => bulkMove(f.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{f.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMoveModal(false)} className="btn-secondary w-full mt-3">Cancel</button>
          </div>
        </div>
      )}

      <UploadReportModal open={showUpload} onClose={() => setShowUpload(false)} folderId={id}
        onUploaded={report => { setReports(p => [{ ...report, tags: '' } as Report, ...p]); setShowUpload(false) }} />

      {folder && <ShareModal open={showShare} onClose={() => setShowShare(false)} folderId={folder.id} folderName={folder.name} />}

      {/* Share subfolder */}
      {subfolderShareId && folder.children.find(c => c.id === subfolderShareId) && (
        <ShareModal
          open={!!subfolderShareId}
          onClose={() => setSubfolderShareId(null)}
          folderId={subfolderShareId}
          folderName={folder.children.find(c => c.id === subfolderShareId)!.name}
        />
      )}

      {folder && showEdit && (
        <CreateFolderModal open={showEdit} onClose={() => setShowEdit(false)}
          initial={{ id: folder.id, name: folder.name, type: folder.type, description: folder.description ?? '' }}
          onCreated={updated => { setFolder(p => p ? { ...p, ...updated } : p); setShowEdit(false) }} />
      )}

      {/* Edit subfolder */}
      {subfolderEditId && (
        <CreateFolderModal
          open={!!subfolderEditId}
          onClose={() => setSubfolderEditId(null)}
          initial={(() => {
            const c = folder.children.find(ch => ch.id === subfolderEditId)
            return c ? { id: c.id, name: c.name, type: c.type } : undefined
          })()}
          onCreated={updated => {
            setFolder(p => p ? { ...p, children: p.children.map(c => c.id === subfolderEditId ? { ...c, ...updated } : c) } : p)
            setSubfolderEditId(null)
          }}
        />
      )}

      {folder && (
        <CreateFolderModal
          open={showSubfolder}
          onClose={() => setShowSubfolder(false)}
          parentId={folder.id}
          parentShares={folder.shares}
          onCreated={child => {
            setFolder(p => p ? { ...p, children: [...p.children, child as Child] } : p)
            setShowSubfolder(false)
            window.dispatchEvent(new CustomEvent('folders-updated'))
          }}
        />
      )}
    </div>
  )
}
