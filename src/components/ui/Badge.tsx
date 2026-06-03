import { cn, FOLDER_TYPE_META, ROLE_META } from '@/lib/utils'

export function FolderTypeBadge({ type }: { type: string }) {
  const meta = FOLDER_TYPE_META[type] ?? FOLDER_TYPE_META.CUSTOM
  return (
    <span className={cn('badge', meta.bg, meta.color)}>
      {meta.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role as keyof typeof ROLE_META] ?? ROLE_META.SALES
  return (
    <span className={cn('badge', meta.bg, meta.color)}>
      {meta.label}
    </span>
  )
}
