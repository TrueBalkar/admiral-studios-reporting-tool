import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Role } from './auth'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const FOLDER_TYPE_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  SALES: { label: 'Sales', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  SDR:   { label: 'SDR',   color: 'text-sky-700',     bg: 'bg-sky-100'     },
  DEV:   { label: 'Dev',   color: 'text-violet-700',  bg: 'bg-violet-100'  },
  CUSTOM:{ label: 'Custom',color: 'text-amber-700',   bg: 'bg-amber-100'   },
}

export const ROLE_META: Record<Role, { label: string; color: string; bg: string }> = {
  ADMIN: { label: 'Admin', color: 'text-red-700',     bg: 'bg-red-100'     },
  SALES: { label: 'Sales', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  SDR:   { label: 'SDR',   color: 'text-sky-700',     bg: 'bg-sky-100'     },
  DEV:   { label: 'Dev',   color: 'text-violet-700',  bg: 'bg-violet-100'  },
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
