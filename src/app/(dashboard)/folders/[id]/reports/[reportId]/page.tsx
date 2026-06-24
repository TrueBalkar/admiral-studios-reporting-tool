'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, User, Maximize2, Minimize2,
  Loader2, ExternalLink, Edit2, Save, X, Download,
  MessageSquare, Tag, History, Link2, Eye, ChevronRight, Trash2,
  Plus, Clock, RotateCcw, Copy, Check,
} from 'lucide-react'
import { formatDate, cn, toEmbedUrl, LINK_TYPES } from '@/lib/utils'
import { splitReportHtml, assembleReport } from '@/lib/layout-render'
import { ReportIcon } from '@/components/ui/ReportIcon'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownEditor = dynamic(() => import('@/components/editor/MarkdownEditor'), { ssr: false })

function StyleableIframe({ html, css, title, headerTemplate, navTemplate, footerTemplate }: {
  html: string; css: string; title: string
  headerTemplate?: string; navTemplate?: string; footerTemplate?: string
}) {
  const parts = splitReportHtml(html)
  const assembled = assembleReport({
    ...parts,
    overrides: {
      header: headerTemplate,
      nav: navTemplate,
      footer: footerTemplate,
    },
  })
  const srcDoc = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${assembled}</body></html>`
  return (
    <iframe srcDoc={srcDoc} className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads" title={title} />
  )
}

interface Report {
  id: string; title: string; fileName: string; fileType: string; createdAt: string; tags: string
  folderId: string; folder: { id: string; name: string; type: string }
  uploadedBy: { id: string; name: string }; uploadedById: string
  styleable: boolean; themeId: string | null
  headerId: string | null; navId: string | null; footerId: string | null
}
interface Theme { id: string; name: string; isDefault?: boolean }
interface LayoutOption { id: string; type: string; name: string; description?: string | null }
interface Comment { id: string; content: string; createdAt: string; user: { id: string; name: string; role: string } }
interface Version { id: string; versionNum: number; fileName: string; createdAt: string; uploadedBy: { name: string } }
interface PublicLink { id: string; token: string; expiresAt: string | null; viewCount: number; hasPassword: boolean; createdAt: string }
interface CurrentUser { userId: string; role: string; name: string }

type Panel = 'comments' | 'tags' | 'versions' | 'links' | null

export default function ReportViewerPage() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>()
  const confirm = useConfirm()
  const [report, setReport] = useState<Report | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [viewStats, setViewStats] = useState({ totalViews: 0, uniqueViewers: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [mdContent, setMdContent] = useState('')
  const [xlsxHtml, setXlsxHtml] = useState('')
  const [xlsxBase64, setXlsxBase64] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  // Themes + layouts
  const [themes, setThemes] = useState<Theme[]>([])
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null)
  const [themeCss, setThemeCss] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [layouts, setLayouts] = useState<LayoutOption[]>([])
  const [activeHeaderId, setActiveHeaderId] = useState<string | null>(null)
  const [activeNavId, setActiveNavId] = useState<string | null>(null)
  const [activeFooterId, setActiveFooterId] = useState<string | null>(null)
  const [layoutTemplates, setLayoutTemplates] = useState<Record<string, string>>({})
  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  // Tags
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  // Versions
  const [versions, setVersions] = useState<Version[]>([])
  const [reuploadFile, setReuploadFile] = useState<File | null>(null)
  const [reuploading, setReuploading] = useState(false)
  // Public links
  const [links, setLinks] = useState<PublicLink[]>([])
  const [linkExpiry, setLinkExpiry] = useState('7')
  const [linkPassword, setLinkPassword] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)
  const [copiedToken, setCopiedToken] = useState('')

  // Fetch + process the report body depending on its type
  async function loadContent(fileType: string, rep?: Report) {
    setContentLoading(true)
    try {
      if (fileType === 'HTML') {
        // Always fetch raw HTML for styleable srcdoc rendering
        setHtmlContent(await fetch(`/api/reports/${reportId}/content`).then(r => r.text()))
      }
      if (fileType === 'MD') {
        setMdContent(await fetch(`/api/reports/${reportId}/content`).then(r => r.text()))
      } else if (fileType === 'XLSX') {
        const base64 = await fetch(`/api/reports/${reportId}/content`).then(r => r.text())
        setXlsxBase64(base64)
        const XLSX = await import('xlsx')
        const wb = XLSX.read(base64, { type: 'base64' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        setXlsxHtml(XLSX.utils.sheet_to_html(ws))
      } else if (LINK_TYPES.includes(fileType as (typeof LINK_TYPES)[number])) {
        setLinkUrl(await fetch(`/api/reports/${reportId}/content`).then(r => r.text()))
      }
    } catch {
      /* leave empty; UI shows fallback */
    } finally {
      setContentLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/reports/${reportId}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/reports/${reportId}/views`).then(r => r.json()),
    ]).then(([d, me, views]) => {
      if (d.error) { setError(d.error); return }
      setReport(d.report)
      setCurrentUser(me.user)
      setViewStats(views)
      setTags(d.report.tags ? d.report.tags.split(',').filter(Boolean) : [])
      loadContent(d.report.fileType, d.report)

      // Load themes + layouts for styleable reports
      if (d.report.styleable) {
        fetch('/api/themes').then(r => r.json()).then(t => {
          setThemes(t.themes || [])
          const tid = d.report.themeId || t.themes?.find((th: Theme) => th.isDefault)?.id
          if (tid) {
            setActiveThemeId(tid)
            fetch(`/api/themes/${tid}/css`).then(r => r.text()).then(setThemeCss)
          }
        })
        fetch('/api/layouts').then(r => r.json()).then(l => {
          setLayouts(l.layouts || [])
          setActiveHeaderId(d.report.headerId)
          setActiveNavId(d.report.navId)
          setActiveFooterId(d.report.footerId)
          // Fetch templates for assigned layouts
          for (const lid of [d.report.headerId, d.report.navId, d.report.footerId].filter(Boolean)) {
            fetch(`/api/layouts/${lid}`).then(r => r.json()).then(data => {
              if (data.layout) setLayoutTemplates(prev => ({ ...prev, [data.layout.id]: data.layout.htmlTemplate }))
            })
          }
        })
      }
    }).catch(() => setError('Failed to load')).finally(() => setLoading(false))

    // Record view
    fetch(`/api/reports/${reportId}/views`, { method: 'POST' }).catch(() => {})
  }, [reportId])

  const canEdit = currentUser && report && (
    currentUser.role === 'ADMIN' || report.uploadedById === currentUser.userId
  )

  async function switchLayout(type: 'HEADER' | 'NAV' | 'FOOTER', layoutId: string | null) {
    const fieldMap = { HEADER: 'headerId', NAV: 'navId', FOOTER: 'footerId' } as const
    const setterMap = { HEADER: setActiveHeaderId, NAV: setActiveNavId, FOOTER: setActiveFooterId }
    setterMap[type](layoutId)
    // Fetch template if we don't have it
    if (layoutId && !layoutTemplates[layoutId]) {
      const data = await fetch(`/api/layouts/${layoutId}`).then(r => r.json())
      if (data.layout) setLayoutTemplates(prev => ({ ...prev, [data.layout.id]: data.layout.htmlTemplate }))
    }
    // Persist
    fetch(`/api/reports/${reportId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldMap[type]]: layoutId }),
    }).catch(() => {})
  }

  async function switchTheme(themeId: string) {
    setActiveThemeId(themeId)
    const css = await fetch(`/api/themes/${themeId}/css`).then(r => r.text())
    setThemeCss(css)
    // Persist the choice on the report
    fetch(`/api/reports/${reportId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeId }) }).catch(() => {})
  }

  function togglePanel(p: Panel) { setPanel(prev => prev === p ? null : p) }

  async function loadPanel(p: Panel) {
    togglePanel(p)
    if (p === 'comments' && !comments.length) {
      const d = await fetch(`/api/reports/${reportId}/comments`).then(r => r.json())
      setComments(d.comments || [])
    }
    if (p === 'versions' && !versions.length) {
      const d = await fetch(`/api/reports/${reportId}/versions`).then(r => r.json())
      setVersions(d.versions || [])
    }
    if (p === 'links' && !links.length) {
      const d = await fetch(`/api/reports/${reportId}/public-link`).then(r => r.json())
      setLinks(d.links || [])
    }
  }

  async function startEdit() {
    setEditTitle(report!.title)
    const content = await fetch(`/api/reports/${reportId}/content`).then(r => r.text())
    setEditContent(content); setEditMode(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, title: editTitle }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Save failed'); return }
      setReport(p => p ? { ...p, title: data.report.title } : p)
      if (report?.fileType === 'MD') setMdContent(editContent)
      setEditMode(false)
    } finally { setSaving(false) }
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPostingComment(true)
    const res = await fetch(`/api/reports/${reportId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newComment }) })
    const d = await res.json()
    if (res.ok) { setComments(p => [...p, d.comment]); setNewComment('') }
    setPostingComment(false)
  }

  async function deleteComment(cid: string) {
    await fetch(`/api/reports/${reportId}/comments/${cid}`, { method: 'DELETE' })
    setComments(p => p.filter(c => c.id !== cid))
  }

  async function addTag() {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || tags.includes(t)) { setNewTag(''); return }
    const next = [...tags, t]
    await fetch(`/api/reports/${reportId}/tags`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: next }) })
    setTags(next); setNewTag('')
  }

  async function removeTag(t: string) {
    const next = tags.filter(x => x !== t)
    await fetch(`/api/reports/${reportId}/tags`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: next }) })
    setTags(next)
  }

  async function reupload() {
    if (!reuploadFile) return
    setReuploading(true)
    const fd = new FormData(); fd.append('file', reuploadFile)
    const res = await fetch(`/api/reports/${reportId}/versions`, { method: 'POST', body: fd })
    if (res.ok) {
      const d = await fetch(`/api/reports/${reportId}/versions`).then(r => r.json())
      setVersions(d.versions || [])
      // Reload content
      if (report?.fileType === 'MD') fetch(`/api/reports/${reportId}/content`).then(r => r.text()).then(setMdContent)
      setReuploadFile(null)
    }
    setReuploading(false)
  }

  async function restoreVersion(vid: string) {
    const ok = await confirm({ title: 'Restore this version?', message: 'The current content will be archived as a new version before restoring.', confirmLabel: 'Restore' })
    if (!ok) return
    await fetch(`/api/reports/${reportId}/versions/${vid}`, { method: 'POST' })
    const d = await fetch(`/api/reports/${reportId}/versions`).then(r => r.json())
    setVersions(d.versions || [])
    if (report?.fileType === 'MD') fetch(`/api/reports/${reportId}/content`).then(r => r.text()).then(setMdContent)
  }

  async function createLink() {
    setCreatingLink(true)
    const res = await fetch(`/api/reports/${reportId}/public-link`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: linkPassword || undefined, expiresInDays: linkExpiry ? parseInt(linkExpiry) : undefined }),
    })
    if (res.ok) {
      const d = await fetch(`/api/reports/${reportId}/public-link`).then(r => r.json())
      setLinks(d.links || []); setLinkPassword(''); setLinkExpiry('7')
    }
    setCreatingLink(false)
  }

  async function deleteLink(lid: string) {
    await fetch(`/api/reports/${reportId}/public-link`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkId: lid }) })
    setLinks(p => p.filter(l => l.id !== lid))
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/shared/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(''), 2000)
  }

  function downloadFile() {
    if (!report) return
    if (report.fileType === 'XLSX' && xlsxBase64) {
      // Decode base64 → binary Blob for a proper .xlsx download
      const bytes = Uint8Array.from(atob(xlsxBase64), c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = report.fileName || 'report.xlsx'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      return
    }
    const a = document.createElement('a')
    a.href = `/api/reports/${reportId}/content`; a.download = report.fileName || 'report'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error || !report) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-gray-500">{error || 'Report not found'}</p>
      <Link href={`/folders/${id}`} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Back</Link>
    </div>
  )

  const ft = report.fileType
  const isMd = ft === 'MD'
  const isHtml = ft === 'HTML'
  const isXlsx = ft === 'XLSX'
  const isLink = LINK_TYPES.includes(ft as (typeof LINK_TYPES)[number])
  const isFile = isMd || isHtml || isXlsx

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className={cn('flex items-center gap-3 px-5 py-2.5 bg-white border-b border-gray-200 flex-shrink-0', fullscreen && 'hidden')}>
        <Link href={`/folders/${id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" /><span className="truncate max-w-28">{report.folder.name}</span>
        </Link>
        <span className="text-gray-300">/</span>
        {editMode ? (
          <input className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-b border-blue-400 focus:outline-none px-1"
            value={editTitle} onChange={e => setEditTitle(e.target.value)} />
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ReportIcon type={ft} className="w-4 h-4 flex-shrink-0" />
            <h1 className="text-sm font-semibold text-gray-900 truncate">{report.title}</h1>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          {/* View stats */}
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 mr-1">
            <Eye className="w-3 h-3" />{viewStats.uniqueViewers}
          </span>

          {/* Panel toggles */}
          {[
            { p: 'comments' as Panel, icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Comments' },
            { p: 'tags' as Panel, icon: <Tag className="w-3.5 h-3.5" />, label: 'Tags' },
            { p: 'versions' as Panel, icon: <History className="w-3.5 h-3.5" />, label: 'Versions' },
            { p: 'links' as Panel, icon: <Link2 className="w-3.5 h-3.5" />, label: 'Share link' },
          ].map(({ p, icon, label }) => (
            <button key={p} onClick={() => loadPanel(p)} title={label}
              className={cn('btn-ghost py-1 px-1.5 text-xs', panel === p && 'bg-blue-50 text-blue-600')}>
              {icon}
            </button>
          ))}

          {/* Theme + layout pickers — only for styleable HTML reports */}
          {report?.styleable && themes.length > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              <select value={activeThemeId ?? ''} onChange={e => switchTheme(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" title="Theme">
                {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {layouts.filter(l => l.type === 'HEADER').length > 0 && (
                <select value={activeHeaderId ?? ''} onChange={e => switchLayout('HEADER', e.target.value || null)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" title="Header layout">
                  <option value="">Default header</option>
                  {layouts.filter(l => l.type === 'HEADER').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              {layouts.filter(l => l.type === 'NAV').length > 0 && (
                <select value={activeNavId ?? ''} onChange={e => switchLayout('NAV', e.target.value || null)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" title="Navigation layout">
                  <option value="">Default nav</option>
                  {layouts.filter(l => l.type === 'NAV').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              {layouts.filter(l => l.type === 'FOOTER').length > 0 && (
                <select value={activeFooterId ?? ''} onChange={e => switchLayout('FOOTER', e.target.value || null)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" title="Footer layout">
                  <option value="">Default footer</option>
                  {layouts.filter(l => l.type === 'FOOTER').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
            </>
          )}

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {!editMode && canEdit && isMd && (
            <button onClick={startEdit} className="btn-secondary py-1 px-2.5 text-xs"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)} className="btn-secondary py-1 px-2.5 text-xs"><X className="w-3.5 h-3.5" /> Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary py-1 px-2.5 text-xs">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </>
          )}
          {isFile && (
            <button onClick={downloadFile} className="btn-ghost py-1 px-1.5 text-xs" title="Download">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {isHtml && <button onClick={() => window.open(`/api/reports/${reportId}/content`, '_blank')} className="btn-ghost py-1 px-1.5 text-xs" title="Open in new tab"><ExternalLink className="w-3.5 h-3.5" /></button>}
          {isLink && linkUrl && <button onClick={() => window.open(linkUrl, '_blank')} className="btn-ghost py-1 px-1.5 text-xs" title="Open original"><ExternalLink className="w-3.5 h-3.5" /></button>}
          <button onClick={() => setFullscreen(v => !v)} className="btn-ghost py-1 px-1.5 text-xs">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {fullscreen && !editMode && (
        <div className="fixed top-3 right-3 z-50">
          <button onClick={() => setFullscreen(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur text-white text-xs rounded-lg hover:bg-black/80">
            <Minimize2 className="w-3.5 h-3.5" /> Exit fullscreen
          </button>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {editMode ? (
            <div className="p-6 max-w-5xl mx-auto">
              <MarkdownEditor content={editContent} onChange={setEditContent} />
            </div>
          ) : isMd ? (
            <div className="p-8 max-w-3xl mx-auto">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdContent}</ReactMarkdown>
              </div>
            </div>
          ) : isXlsx ? (
            contentLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : (
              <div className="p-6 overflow-auto">
                <div className="xlsx-table" dangerouslySetInnerHTML={{ __html: xlsxHtml }} />
              </div>
            )
          ) : isLink ? (
            contentLoading || !linkUrl ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                  <span>Embedded view. If it appears blank, the source may block embedding — open it directly.</span>
                  <button onClick={() => window.open(linkUrl, '_blank')} className="btn-secondary py-1 px-2.5 text-xs flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" /> Open original
                  </button>
                </div>
                <iframe
                  src={toEmbedUrl(ft, linkUrl)}
                  className="w-full flex-1 border-0"
                  allow="fullscreen; clipboard-read; clipboard-write"
                  title={report.title}
                />
              </div>
            )
          ) : report.styleable && themeCss && htmlContent ? (
            <StyleableIframe html={htmlContent} css={themeCss} title={report.title}
              headerTemplate={activeHeaderId ? layoutTemplates[activeHeaderId] : undefined}
              navTemplate={activeNavId ? layoutTemplates[activeNavId] : undefined}
              footerTemplate={activeFooterId ? layoutTemplates[activeFooterId] : undefined}
            />
          ) : (
            /* Regular HTML: serve from API as-is */
            <iframe src={`/api/reports/${reportId}/content`} className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads" title={report.title} />
          )}
        </div>

        {/* Side panel */}
        {panel && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-800 capitalize">{panel}</h3>
              <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* COMMENTS */}
              {panel === 'comments' && (
                <div className="space-y-4">
                  {comments.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No comments yet</p>}
                  {comments.map(c => (
                    <div key={c.id} className="group">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">{c.user.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-800">{c.user.name}</span>
                            <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{c.content}</p>
                        </div>
                        {(currentUser?.userId === c.user.id || currentUser?.role === 'ADMIN') && (
                          <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="input text-xs resize-none" rows={3}
                      onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) postComment() }} />
                    <button onClick={postComment} disabled={postingComment || !newComment.trim()} className="btn-primary w-full mt-2 text-xs py-1.5">
                      {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post comment'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAGS */}
              {panel === 'tags' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length === 0 && <p className="text-xs text-gray-400">No tags yet</p>}
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                        #{t}
                        {canEdit && <button onClick={() => removeTag(t)} className="hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>}
                      </span>
                    ))}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <input className="input text-xs flex-1" placeholder="Add tag…" value={newTag}
                        onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
                      <button onClick={addTag} className="btn-primary px-3 py-1.5 text-xs"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">Press Enter or click + to add. Tags are searchable.</p>
                </div>
              )}

              {/* VERSIONS */}
              {panel === 'versions' && (
                <div className="space-y-4">
                  {canEdit && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">Re-upload new version</p>
                      <input type="file" accept=".html,.md" onChange={e => setReuploadFile(e.target.files?.[0] ?? null)}
                        className="text-xs text-gray-600 mb-2 block" />
                      <button onClick={reupload} disabled={!reuploadFile || reuploading} className="btn-primary w-full text-xs py-1.5">
                        {reuploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Upload & archive current'}
                      </button>
                    </div>
                  )}
                  {versions.length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">No previous versions</p>
                    : versions.map(v => (
                      <div key={v.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-gray-600">v{v.versionNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{v.fileName}</p>
                          <p className="text-[10px] text-gray-400">{v.uploadedBy.name} · {formatDate(v.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => window.open(`/api/reports/${reportId}/versions/${v.id}`, '_blank')} className="p-1 text-gray-400 hover:text-blue-500 transition-colors" title="Preview">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          {canEdit && (
                            <button onClick={() => restoreVersion(v.id)} className="p-1 text-gray-400 hover:text-emerald-500 transition-colors" title="Restore">
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* PUBLIC LINKS */}
              {panel === 'links' && (
                <div className="space-y-4">
                  {canEdit && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <p className="text-xs font-medium text-gray-700">Create public link</p>
                      <input className="input text-xs" placeholder="Password (optional)" type="password" value={linkPassword} onChange={e => setLinkPassword(e.target.value)} />
                      <select className="input text-xs" value={linkExpiry} onChange={e => setLinkExpiry(e.target.value)}>
                        <option value="">No expiry</option>
                        <option value="1">Expires in 1 day</option>
                        <option value="7">Expires in 7 days</option>
                        <option value="30">Expires in 30 days</option>
                      </select>
                      <button onClick={createLink} disabled={creatingLink} className="btn-primary w-full text-xs py-1.5">
                        {creatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Link2 className="w-3.5 h-3.5" /> Generate link</>}
                      </button>
                    </div>
                  )}
                  {links.length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">No public links yet</p>
                    : links.map(l => (
                      <div key={l.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-600 truncate flex-1">{l.token.slice(0, 16)}…</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => copyLink(l.token)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                              {copiedToken === l.token ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button onClick={() => deleteLink(l.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{l.viewCount} views</span>
                          {l.hasPassword && <span>🔒 Password</span>}
                          {l.expiresAt && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Expires {formatDate(l.expiresAt)}</span>}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
