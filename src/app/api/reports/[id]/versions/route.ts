import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const versions = await prisma.reportVersion.findMany({
    where: { reportId: params.id },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { versionNum: 'desc' },
  })
  return NextResponse.json({ versions })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { folder: true } })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEdit = user.role === 'ADMIN' || report.uploadedById === user.userId || report.folder.createdById === user.userId
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

  const isHtml = file.name.toLowerCase().endsWith('.html')
  const isMd   = file.name.toLowerCase().endsWith('.md')
  if (!isHtml && !isMd) return NextResponse.json({ error: 'Only .html and .md files' }, { status: 400 })

  const lastVersion = await prisma.reportVersion.findFirst({ where: { reportId: params.id }, orderBy: { versionNum: 'desc' } })
  const nextNum = (lastVersion?.versionNum ?? 0) + 1

  // Archive current content as a version
  await prisma.reportVersion.create({
    data: { reportId: params.id, versionNum: nextNum, content: report.content, fileName: report.fileName, uploadedById: user.userId },
  })

  // Update report with new content
  const newContent = await file.text()
  await prisma.report.update({ where: { id: params.id }, data: { content: newContent, fileName: file.name, updatedAt: new Date() } })

  return NextResponse.json({ ok: true, versionNum: nextNum })
}
