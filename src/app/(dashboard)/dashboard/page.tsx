'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FolderOpen, FileText, Users, Upload, Pin, PinOff,
  Clock, Share2, Loader2, AlertTriangle, History,
} from 'lucide-react'
import { FolderTypeBadge } from '@/components/ui/Badge'
import { ReportIconTile } from '@/components/ui/ReportIcon'
import { formatDate, cn } from '@/lib/utils'
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import UploadReportModal from '@/components/UploadReportModal'

interface DashboardData {
  stats: { folderCount: number; reportCount: number; userCount: number | null }
  recentReports: { id: string; title: string; fileType: string; createdAt: string; folder: { id: string; name: string; type: string }; uploadedBy: { name: string } }[]
  activityFeed: { id: string; userName: string; action: string; targetName?: string | null; folderName?: string | null; createdAt: string }[]
  heatmap: { org: Record<string, number>; me: Record<string, number> }
  sharedWithMe: { id: string; name: string; type: string; color?: string | null; _count: { reports: number } }[]
  staleFolders: { id: string; name: string; type: string; color?: string | null; _count: { reports: number } }[]
  recentlyViewed: { id: string; title: string; fileType: string; folder: { id: string; name: string; type: string }; viewedAt: string }[]
}
interface PinnedItem { id: string; folder: { id: string; name: string; type: string; color?: string | null; _count: { reports: number }; createdBy: { name: string } } }
interface AllFolder { id: string; name: string; type: string; color?: string | null; parentId: string | null; _count: { reports: number; children: number } }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [pinned, setPinned] = useState<PinnedItem[]>([])
  const [allFolders, setAllFolders] = useState<AllFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFolderId, setUploadFolderId] = useState('')
  const [togglingPin, setTogglingPin] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/pinned').then(r => r.json()),
      fetch('/api/folders').then(r => r.json()),
    ]).then(([d, p, f]) => { setData(d); setPinned(p.pinned || []); setAllFolders(f.folders || []) })
    .finally(() => setLoading(false))
  }, [])

  async function togglePin(folderId: string) {
    const isPinned = pinned.some(p => p.folder.id === folderId)
    setTogglingPin(folderId)
    try {
      if (isPinned) {
        await fetch('/api/pinned', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId }) })
        setPinned(p => p.filter(i => i.folder.id !== folderId))
      } else {
        await fetch('/api/pinned', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId }) })
        const res = await fetch('/api/pinned'); const d = await res.json(); setPinned(d.pinned || [])
      }
    } finally { setTogglingPin(null) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (!data) return null

  const topFolders = allFolders.filter(f => !f.parentId)
  const pinnedFolderIds = new Set(pinned.map(p => p.folder.id))

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Folders',   value: data.stats.folderCount, icon: FolderOpen, grad: 'from-blue-500 to-blue-600' },
          { label: 'Reports',   value: data.stats.reportCount, icon: FileText,   grad: 'from-emerald-500 to-emerald-600' },
          ...(data.stats.userCount !== null ? [{ label: 'Users', value: data.stats.userCount, icon: Users, grad: 'from-violet-500 to-violet-600' }] : []),
          { label: 'Shared with me', value: data.sharedWithMe.length, icon: Share2, grad: 'from-amber-500 to-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br shadow-sm', s.grad)}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
        <div className="card p-4 flex items-center gap-3 border-dashed border-2 border-gray-200 bg-transparent hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
          onClick={() => { setUploadFolderId(''); setShowUpload(true) }}>
          <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
            <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div><p className="text-sm font-semibold text-gray-600 group-hover:text-blue-700">Quick Upload</p><p className="text-xs text-gray-400">Add a report</p></div>
        </div>
      </div>

      {/* Heatmap */}
      <ActivityHeatmap orgData={data.heatmap.org} myData={data.heatmap.me} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recently Viewed */}
          {data.recentlyViewed.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-800">Recently Viewed</h3></div>
              <div className="space-y-1.5">
                {data.recentlyViewed.map(r => (
                  <Link key={r.id} href={`/folders/${r.folder.id}/reports/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                    <ReportIconTile type={r.fileType} className="w-7 h-7 [&_svg]:w-3.5 [&_svg]:h-3.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">{r.title}</p>
                      <p className="text-xs text-gray-400">{r.folder.name}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(r.viewedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reports */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Reports</h3>
            {data.recentReports.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No reports yet</p> : (
              <div className="space-y-1.5">
                {data.recentReports.map(r => (
                  <Link key={r.id} href={`/folders/${r.folder.id}/reports/${r.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                    <ReportIconTile type={r.fileType} className="w-8 h-8 [&_svg]:w-4 [&_svg]:h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">{r.title}</p>
                      <p className="text-xs text-gray-400 truncate">{r.folder.name} · {r.uploadedBy.name}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(r.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ActivityFeed items={data.activityFeed} />
        </div>

        <div className="space-y-5">
          {/* Pinned Folders */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-800">Pinned Folders</h3><Pin className="w-3.5 h-3.5 text-gray-400" /></div>
            {pinned.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Pin folders for quick access</p>}
            {pinned.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {pinned.map(p => (
                  <div key={p.id} className="flex items-center gap-2 group">
                    <Link href={`/folders/${p.folder.id}`} className="flex items-center gap-2 flex-1 min-w-0 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      {p.folder.color
                        ? <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: p.folder.color }} />
                        : <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <span className="text-sm text-gray-700 truncate flex-1">{p.folder.name}</span>
                      <FolderTypeBadge type={p.folder.type} />
                    </Link>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); togglePin(p.folder.id) }} disabled={togglingPin === p.folder.id} title="Unpin" className="p-1 text-amber-500 hover:text-red-500 transition-all flex-shrink-0">
                      {togglingPin === p.folder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PinOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {topFolders.length > 0 && (
              <div className={cn(pinned.length > 0 && 'pt-3 border-t border-gray-100')}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">All folders</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {topFolders.filter(f => !pinnedFolderIds.has(f.id)).map(f => (
                    <div key={f.id} className="flex items-center gap-2 group py-1">
                      <Link href={`/folders/${f.id}`} className="flex-1 min-w-0 flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 truncate">
                        {f.color
                          ? <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: f.color }} />
                          : <FolderOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                        <span className="truncate">{f.name}</span>
                      </Link>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); togglePin(f.id) }}
                        disabled={togglingPin === f.id}
                        title="Pin folder"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors flex-shrink-0"
                      >
                        {togglingPin === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Pin className="w-3 h-3" /> Pin</>}
                      </button>
                    </div>
                  ))}
                  {topFolders.filter(f => !pinnedFolderIds.has(f.id)).length === 0 && (
                    <p className="text-[11px] text-gray-300 py-1">All folders pinned</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {data.sharedWithMe.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-800">Shared With Me</h3><Share2 className="w-3.5 h-3.5 text-gray-400" /></div>
              <div className="space-y-1.5">
                {data.sharedWithMe.map(f => (
                  <Link key={f.id} href={`/folders/${f.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    {f.color
                      ? <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: f.color }} />
                      : <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                    <FolderTypeBadge type={f.type} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.staleFolders.length > 0 && (
            <div className="card p-5 border-amber-200">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-800">Stale Folders</h3><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></div>
              <p className="text-xs text-gray-400 mb-2">No new reports in 30+ days</p>
              <div className="space-y-1.5">
                {data.staleFolders.map(f => (
                  <Link key={f.id} href={`/folders/${f.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-50 transition-colors">
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                    <span className="text-xs text-gray-400">{f._count.reports}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpload && uploadFolderId && (
        <UploadReportModal open={showUpload} onClose={() => { setShowUpload(false); setUploadFolderId('') }}
          folderId={uploadFolderId} onUploaded={() => { setShowUpload(false); setUploadFolderId('') }} />
      )}

      {showUpload && !uploadFolderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10">
            <h3 className="font-semibold text-gray-900 mb-1">Choose a folder</h3>
            <p className="text-xs text-gray-400 mb-3">Select where to upload your report</p>
            {allFolders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No folders available. Create a folder first.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {topFolders.map(f => {
                  const children = allFolders.filter(c => c.parentId === f.id)
                  return (
                    <div key={f.id}>
                      <button onClick={() => setUploadFolderId(f.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                        {f.color
                          ? <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: f.color }} />
                          : <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{f.name}</span>
                        <FolderTypeBadge type={f.type} />
                      </button>
                      {children.map(c => (
                        <button key={c.id} onClick={() => setUploadFolderId(c.id)} className="w-full flex items-center gap-3 p-2.5 ml-4 mt-1 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left" style={{ width: 'calc(100% - 1rem)' }}>
                          <FolderOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 flex-1 truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={() => setShowUpload(false)} className="btn-secondary w-full mt-3">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
