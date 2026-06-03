'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' })
  const resolver = useRef<(v: boolean) => void>()

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => { resolver.current = resolve })
  }, [])

  function handle(result: boolean) {
    setOpen(false)
    resolver.current?.(result)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={open}
        title={opts.title}
        message={opts.message}
        confirmLabel={opts.confirmLabel}
        cancelLabel={opts.cancelLabel}
        danger={opts.danger}
        onConfirm={() => handle(true)}
        onCancel={() => handle(false)}
      />
    </ConfirmContext.Provider>
  )
}
