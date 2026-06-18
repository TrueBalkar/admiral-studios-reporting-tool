'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, FolderOpen, Plus, Settings, LogOut,
  ChevronRight, X, Loader2, Home, Keyboard, User,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from './ui/Logo'
import CreateFolderModal from './CreateFolderModal'
import NotificationBell from './NotificationBell'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import ClaudeAssistant from './ClaudeAssistant'

interface Folder {
  id: string; name: string; type: string; color?: string | null
  parentId: string | null | undefined
  _count: { reports: number; children: number }
}
interface UserProp { userId: string; name: string; email: string; role: string }

const EXPANDED_W = 240
const COLLAPSED_W = 64

export default function Sidebar({ user }: { user: UserProp }) {
  const pathname = usePathname()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{
    folders: Folder[]
    reports: { id: string; title: string; folder: { id: string; name: string } }[]
  } | null>(null)
  const [searching, setSearching] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [showShortcuts, setShowShortcuts] = useState(false)

  const fetchFolders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data.folders || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchFolders() }, [fetchFolders])

  // Listen for folder changes from other pages (subfolder creation, deletion)
  useEffect(() => {
    const handler = () => fetchFolders()
    window.addEventListener('folders-updated', handler)
    return () => window.removeEventListener('folders-updated', handler)
  }, [fetchFolders])

  // Restore collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') applyCollapse(true, false)
  }, [])

  function applyCollapse(isCollapsed: boolean, save = true) {
    setCollapsed(isCollapsed)
    const main = document.getElementById('main-content')
    if (main) main.style.marginLeft = isCollapsed ? `${COLLAPSED_W}px` : `${EXPANDED_W}px`
    if (save) localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }

  function toggleCollapse() { applyCollapse(!collapsed) }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === '?') { setShowShortcuts(true); return }
      if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('[data-search]')?.focus(); return }
      if (e.key === 'n' || e.key === 'N') { setShowCreate(true); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (collapsed || !search.trim()) { setSearchResults(null); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
        setSearchResults(await res.json())
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [search, collapsed])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login'); router.refresh()
  }

  const activeFolderId = pathname.match(/\/folders\/([^/]+)/)?.[1]
  const topLevel = folders.filter(f => !f.parentId)
  const childMap: Record<string, Folder[]> = {}
  for (const f of folders) { if (f.parentId) { (childMap[f.parentId as string] ??= []).push(f) } }

  const sidebarStyle = {
    width: collapsed ? `${COLLAPSED_W}px` : `${EXPANDED_W}px`,
    transition: 'width 0.2s ease',
  }

  return (
    <>
      <aside
        style={sidebarStyle}
        className="fixed left-0 top-0 h-screen bg-gray-100 border-r border-gray-200 flex flex-col z-30 overflow-hidden"
      >
        {/* Header */}
        {collapsed ? (
          <div className="px-2 pt-4 pb-3 border-b border-gray-200 flex flex-col items-center gap-2">
            <Link href="/dashboard" className="w-9 h-9 bg-white rounded-lg flex items-center justify-center ring-1 ring-gray-200">
              <Logo className="w-5 h-5" />
            </Link>
            <button
              onClick={toggleCollapse}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-3 pt-4 pb-3 border-b border-gray-200 flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-gray-200">
                <Logo className="w-4 h-4" />
              </div>
              <span className="font-semibold text-gray-900 text-sm truncate">CRM Reports</span>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <NotificationBell />
              <button
                onClick={toggleCollapse}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search — hidden when collapsed */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-2 relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                data-search
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {search.trim() && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
                {searching && <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>}
                {!searching && searchResults && (
                  <>
                    {!searchResults.folders.length && !searchResults.reports.length && (
                      <p className="text-xs text-gray-400 px-3 py-3">No results</p>
                    )}
                    {searchResults.folders.length > 0 && (
                      <div className="p-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 pt-1 pb-0.5">Folders</p>
                        {searchResults.folders.map(f => (
                          <button key={f.id} onClick={() => { router.push(`/folders/${f.id}`); setSearch('') }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left">
                            <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700 truncate">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.reports.length > 0 && (
                      <div className="p-1 border-t border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 pt-1 pb-0.5">Reports</p>
                        {searchResults.reports.map(r => (
                          <button key={r.id} onClick={() => { router.push(`/folders/${r.folder.id}/reports/${r.id}`); setSearch('') }}
                            className="w-full flex flex-col px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left">
                            <span className="text-sm text-gray-700 truncate">{r.title}</span>
                            <span className="text-xs text-gray-400 truncate">in {r.folder.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="px-2 pb-1">
          <Link
            href="/dashboard"
            className={cn('sidebar-item', pathname === '/dashboard' && 'active', collapsed && 'justify-center px-0')}
            title={collapsed ? 'Dashboard' : undefined}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </Link>
        </div>

        {/* Folders section */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {!collapsed && (
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Folders</span>
              <button
                onClick={() => setShowCreate(true)}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                title="New folder (N)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {collapsed ? (
            /* Collapsed: just icons */
            <div className="space-y-0.5 mt-1">
              <button onClick={() => setShowCreate(true)} className="sidebar-item w-full justify-center px-0" title="New folder">
                <Plus className="w-4 h-4" />
              </button>
              {topLevel.map(folder => (
                <Link
                  key={folder.id}
                  href={`/folders/${folder.id}`}
                  className={cn('sidebar-item justify-center px-0', activeFolderId === folder.id && 'active')}
                  title={folder.name}
                >
                  {folder.color
                    ? <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: folder.color }} />
                    : <FolderOpen className="w-4 h-4" />
                  }
                </Link>
              ))}
            </div>
          ) : loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
          ) : topLevel.length === 0 ? (
            <div className="px-2 py-3 text-center">
              <p className="text-xs text-gray-400">No folders yet</p>
              <button onClick={() => setShowCreate(true)} className="text-xs text-blue-600 hover:underline mt-1">Create one</button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {topLevel.map(folder => {
                const children = childMap[folder.id] || []
                const isExpanded = !collapsedFolders[folder.id]
                const isActive = activeFolderId === folder.id
                const childActive = children.some(c => c.id === activeFolderId)

                return (
                  <div key={folder.id}>
                    <div className={cn('sidebar-item group pr-1', (isActive || childActive) && 'active')}>
                      {children.length > 0 ? (
                        <button
                          onClick={() => setCollapsedFolders(p => ({ ...p, [folder.id]: !p[folder.id] }))}
                          className="flex-shrink-0 p-0.5 -ml-0.5 hover:bg-gray-300 rounded"
                        >
                          <ChevronRight className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
                        </button>
                      ) : <span className="w-4 flex-shrink-0" />}

                      <Link href={`/folders/${folder.id}`} className="flex-1 flex items-center gap-2 min-w-0">
                        {folder.color
                          ? <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: folder.color }} />
                          : <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        }
                        <span className="truncate">{folder.name}</span>
                      </Link>
                    </div>

                    {children.length > 0 && isExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                        {children.map(child => (
                          <Link
                            key={child.id}
                            href={`/folders/${child.id}`}
                            className={cn('sidebar-item text-xs py-1.5', activeFolderId === child.id && 'active')}
                          >
                            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{child.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="border-t border-gray-200 px-2 py-2 space-y-0.5">
          <ClaudeAssistant collapsed={collapsed} />
          {user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={cn('sidebar-item', pathname === '/admin' && 'active', collapsed && 'justify-center px-0')}
              title={collapsed ? 'Admin' : undefined}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Admin</span>}
            </Link>
          )}

          <Link
            href="/profile"
            className={cn('sidebar-item', pathname === '/profile' && 'active', collapsed && 'justify-center px-0')}
            title={collapsed ? 'Profile' : undefined}
          >
            <User className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Profile</span>}
          </Link>

          {!collapsed && (
            <button onClick={() => setShowShortcuts(true)} className="sidebar-item w-full text-left">
              <Keyboard className="w-4 h-4" />
              <span>Shortcuts</span>
              <span className="ml-auto text-[10px] text-gray-400 font-mono">?</span>
            </button>
          )}

          {/* User info + logout */}
          <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg', collapsed && 'justify-center')}>
            <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0 group">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">{user.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user.role}</p>
                </div>
              )}
            </Link>
            {!collapsed && (
              <button
                onClick={logout}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <CreateFolderModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={folder => {
          setFolders(prev => [folder as Folder, ...prev])
          setShowCreate(false)
          router.push(`/folders/${folder.id}`)
        }}
      />
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  )
}
