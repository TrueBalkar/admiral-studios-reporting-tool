'use client'

import { useEffect } from 'react'
import { Keyboard } from 'lucide-react'
import Modal from './ui/Modal'

const SHORTCUTS = [
  { key: '/', label: 'Focus search' },
  { key: 'N', label: 'New folder' },
  { key: 'U', label: 'Upload report' },
  { key: '?', label: 'Show shortcuts' },
  { key: 'Esc', label: 'Close modal / cancel' },
]

interface Props { open: boolean; onClose: () => void }

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-2">
        {SHORTCUTS.map(s => (
          <div key={s.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-700">{s.label}</span>
            <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">{s.key}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  )
}
