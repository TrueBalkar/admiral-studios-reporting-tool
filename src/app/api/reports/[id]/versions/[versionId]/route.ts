import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string; versionId: string } }) {
  const user = await getAuthUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const version = await prisma.reportVersion.findUnique({ where: { id: params.versionId } })
  if (!version || version.reportId !== params.id) return new NextResponse('Not found', { status: 404 })

  return new NextResponse(version.content, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(req: NextRequest, { params }: { params: { id: string; versionId: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const version = await prisma.reportVersion.findUnique({ where: { id: params.versionId } })
  if (!version || version.reportId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { folder: true } })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEdit = user.role === 'ADMIN' || report.uploadedById === user.userId || report.folder.createdById === user.userId
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Save current as new version before restoring
  const lastVersion = await prisma.reportVersion.findFirst({ where: { reportId: params.id }, orderBy: { versionNum: 'desc' } })
  await prisma.reportVersion.create({
    data: { reportId: params.id, versionNum: (lastVersion?.versionNum ?? 0) + 1, content: report.content, fileName: report.fileName, uploadedById: user.userId },
  })

  await prisma.report.update({ where: { id: params.id }, data: { content: version.content, fileName: version.fileName } })
  return NextResponse.json({ ok: true })
}
