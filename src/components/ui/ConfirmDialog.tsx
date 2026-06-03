'use client'

import { useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm z-10 p-5">
        <div className="flex items-start gap-3.5">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            danger ? 'bg-red-100' : 'bg-blue-100')}>
            <AlertTriangle className={cn('w-5 h-5', danger ? 'text-red-600' : 'text-blue-600')} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {message && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="btn-secondary flex-1">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('flex-1', danger ? 'btn-danger' : 'btn-primary')}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
