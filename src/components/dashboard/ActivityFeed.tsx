'use client'

import { ACTION_LABELS } from '@/lib/activity'
import { formatDate } from '@/lib/utils'

interface ActivityItem {
  id: string
  userName: string
  action: string
  targetName?: string | null
  folderName?: string | null
  createdAt: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Activity</h3>
        <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5">
              {item.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-medium">{item.userName}</span>
                {' '}
                <span className="text-gray-500">{ACTION_LABELS[item.action as keyof typeof ACTION_LABELS] ?? item.action}</span>
                {item.targetName && <> <span className="font-medium text-gray-800">"{item.targetName}"</span></>}
                {item.folderName && <> <span className="text-gray-400">in</span> <span className="text-gray-600">{item.folderName}</span></>}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(item.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
