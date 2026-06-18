import { FileText, FileCode, FileSpreadsheet, Figma, Sheet, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconType = typeof FileText

const MAP: Record<string, { Icon: IconType; color: string; bg: string }> = {
  HTML:   { Icon: FileText,        color: 'text-blue-500',    bg: 'bg-blue-50'    },
  MD:     { Icon: FileCode,        color: 'text-violet-500',  bg: 'bg-violet-50'  },
  XLSX:   { Icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  FIGMA:  { Icon: Figma,           color: 'text-pink-500',    bg: 'bg-pink-50'    },
  GSHEET: { Icon: Sheet,           color: 'text-green-600',   bg: 'bg-green-50'   },
  LINK:   { Icon: Link2,           color: 'text-sky-500',     bg: 'bg-sky-50'     },
}

export function reportIconMeta(fileType: string) {
  return MAP[fileType] ?? MAP.HTML
}

/** Bare icon, colored by file type. */
export function ReportIcon({ type, className }: { type: string; className?: string }) {
  const { Icon, color } = reportIconMeta(type)
  return <Icon className={cn(color, className)} />
}

/** Icon inside a rounded colored tile. */
export function ReportIconTile({ type, className }: { type: string; className?: string }) {
  const { Icon, color, bg } = reportIconMeta(type)
  return (
    <div className={cn('rounded-lg flex items-center justify-center flex-shrink-0', bg, className)}>
      <Icon className={cn(color, 'w-5 h-5')} />
    </div>
  )
}
