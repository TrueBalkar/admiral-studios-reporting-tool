'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notif {
  id: string; type: string; title: string; body?: string | null
  link?: string | null; read: boolean; createdAt: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_COLORS: Record<string, string> = {
  FOLDER_SHARED: 'bg-blue-100 text-blue-600',
  REPORT_UPLOADED: 'bg-emerald-100 text-emerald-600',
  COMMENT_ADDED: 'bg-violet-100 text-violet-600',
}

export default function NotificationBell() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  function openDropdown() {
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + 8, left: rect.left })
    setOpen(v => !v)
  }

  async function fetchNotifs() {
    const res = await fetch('/api/notifications')
    if (!res.ok) return
    const d = await res.json()
    setNotifs(d.notifications || [])
    setUnread(d.unreadCount || 0)
  }

  useEffect(() => { fetchNotifs(); const t = setInterval(fetchNotifs, 30000); return () => clearInterval(t) }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'all' }) })
    setNotifs(p => p.map(n => ({ ...n, read: true }))); setUnread(0)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(p => Math.max(0, p - 1))
  }

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={openDropdown} className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          className="w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-[60] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
            ) : notifs.map(n => (
              <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {n.type.replace('_', ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.link && (
                      <button onClick={() => { router.push(n.link!); setOpen(false) }} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="p-1 text-gray-300 hover:text-emerald-500 transition-colors">
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
