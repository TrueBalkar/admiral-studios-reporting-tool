import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, reportIds, targetFolderId } = await req.json()
  if (!reportIds?.length) return NextResponse.json({ error: 'No reports selected' }, { status: 400 })

  const reports = await prisma.report.findMany({
    where: { id: { in: reportIds } },
    include: { folder: true },
  })

  for (const report of reports) {
    const canModify = user.role === 'ADMIN' || report.uploadedById === user.userId || report.folder.createdById === user.userId
    if (!canModify) return NextResponse.json({ error: `No permission on "${report.title}"` }, { status: 403 })
  }

  if (action === 'delete') {
    await prisma.report.deleteMany({ where: { id: { in: reportIds } } })
    return NextResponse.json({ ok: true, count: reportIds.length })
  }

  if (action === 'move' && targetFolderId) {
    const target = await prisma.folder.findUnique({ where: { id: targetFolderId } })
    if (!target) return NextResponse.json({ error: 'Target folder not found' }, { status: 404 })
    await prisma.report.updateMany({ where: { id: { in: reportIds } }, data: { folderId: targetFolderId } })
    return NextResponse.json({ ok: true, count: reportIds.length })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
