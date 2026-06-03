import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { folder: true } })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEdit = user.role === 'ADMIN' || report.uploadedById === user.userId || report.folder.createdById === user.userId
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tags } = await req.json()
  const cleaned = (tags as string[]).map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean)
  const updated = await prisma.report.update({ where: { id: params.id }, data: { tags: cleaned.join(',') } })
  return NextResponse.json({ tags: updated.tags ? updated.tags.split(',') : [] })
}
