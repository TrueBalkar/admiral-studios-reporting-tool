import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ACTION_LABELS } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const page    = parseInt(searchParams.get('page') ?? '1')
  const limit   = parseInt(searchParams.get('limit') ?? '50')
  const action  = searchParams.get('action') ?? ''
  const userId  = searchParams.get('userId') ?? ''
  const csv     = searchParams.get('csv') === 'true'

  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
  }

  if (csv) {
    const all = await prisma.activity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10000 })
    const header = 'Date,User,Action,Target,Folder\n'
    const rows = all.map(a =>
      [a.createdAt.toISOString(), a.userName, ACTION_LABELS[a.action as keyof typeof ACTION_LABELS] ?? a.action, a.targetName ?? '', a.folderName ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')
    return new NextResponse(header + rows, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit-log.csv"' },
    })
  }

  const [total, items] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
  ])

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) })
}
