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

// fileType values: HTML | MD | XLSX | FIGMA | GSHEET | LINK
export const FILE_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  HTML:   { label: 'HTML',         color: 'text-blue-600',    bg: 'bg-blue-50'    },
  MD:     { label: 'Markdown',     color: 'text-violet-600',  bg: 'bg-violet-50'  },
  XLSX:   { label: 'Excel',        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  FIGMA:  { label: 'Figma',        color: 'text-pink-600',    bg: 'bg-pink-50'    },
  GSHEET: { label: 'Google Sheet', color: 'text-green-600',   bg: 'bg-green-50'   },
  LINK:   { label: 'Link',         color: 'text-sky-600',     bg: 'bg-sky-50'     },
}

export const LINK_TYPES = ['FIGMA', 'GSHEET', 'LINK'] as const

/** Transform a stored link URL into something embeddable in an iframe. */
export function toEmbedUrl(fileType: string, url: string): string {
  try {
    if (fileType === 'FIGMA') {
      // Modern embed: swap host to embed.figma.com (supports file/design/proto/board/slides)
      const embedded = url
        .replace('://www.figma.com', '://embed.figma.com')
        .replace('://figma.com', '://embed.figma.com')
      const sep = embedded.includes('?') ? '&' : '?'
      return `${embedded}${sep}embed-host=admiral`
    }
    if (fileType === 'GSHEET') {
      // Google Docs/Sheets: /edit or /view → /preview gives an embeddable read-only view
      return url.replace(/\/(edit|view)(\?[^#]*)?(#.*)?$/, '/preview')
    }
    return url
  } catch {
    return url
  }
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
