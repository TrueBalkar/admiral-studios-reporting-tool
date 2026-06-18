'use client'

import { useState } from 'react'
import { Sparkles, PanelRight, ExternalLink } from 'lucide-react'
import Modal from './ui/Modal'
import { cn } from '@/lib/utils'

const CLAUDE_URL = 'https://claude.ai/new'

interface Props {
  collapsed?: boolean
}

export default function ClaudeAssistant({ collapsed }: Props) {
  const [open, setOpen] = useState(false)

  function openSideWindow() {
    const w = 460
    const h = typeof window !== 'undefined' ? window.screen.availHeight : 900
    const left = typeof window !== 'undefined' ? window.screen.availWidth - w : 0
    window.open(CLAUDE_URL, 'claude_assistant', `width=${w},height=${h},left=${left},top=0,noopener`)
    setOpen(false)
  }

  function openNewTab() {
    window.open(CLAUDE_URL, '_blank', 'noopener')
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ask Claude"
        className={cn('sidebar-item w-full text-left', collapsed && 'justify-center px-0')}
      >
        <Sparkles className="w-4 h-4 flex-shrink-0 text-blue-600" />
        {!collapsed && <span>Ask Claude</span>}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ask Claude" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Open Claude with your own account to ask questions while you work.
              It opens in a separate window because Claude can't be embedded directly in another site.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button onClick={openSideWindow} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
              <PanelRight className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Open side window</p>
                <p className="text-xs text-gray-400">Docks Claude to the right of your screen</p>
              </div>
            </button>
            <button onClick={openNewTab} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
              <ExternalLink className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Open in new tab</p>
                <p className="text-xs text-gray-400">Full Claude in a browser tab</p>
              </div>
            </button>
          </div>

          <p className="text-[11px] text-gray-400">
            Tip: if the side window doesn't appear, your browser may have blocked the popup — allow popups for this site.
          </p>
        </div>
      </Modal>
    </>
  )
}
