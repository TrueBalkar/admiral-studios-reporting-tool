import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { hasAccessToFolder } from '@/lib/access'
import { recordActivity } from '@/lib/activity'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ok = await hasAccessToFolder(params.id, user.userId, user.role)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const reports = await prisma.report.findMany({
    where: { folderId: params.id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ reports })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ok = await hasAccessToFolder(params.id, user.userId, user.role)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const title = formData.get('title') as string
  const file = formData.get('file') as File | null

  if (!title?.trim() || !file) return NextResponse.json({ error: 'Title and file are required' }, { status: 400 })

  const isHtml = file.name.toLowerCase().endsWith('.html') || file.type === 'text/html'
  const isMd   = file.name.toLowerCase().endsWith('.md')   || file.type === 'text/markdown'
  if (!isHtml && !isMd) return NextResponse.json({ error: 'Only .html and .md files are allowed' }, { status: 400 })

  const content  = await file.text()
  const fileType = isMd ? 'MD' : 'HTML'

  const report = await prisma.report.create({
    data: { title: title.trim(), folderId: params.id, uploadedById: user.userId, fileName: file.name, fileType, content },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  recordActivity({
    userId: user.userId, userName: user.name, action: 'UPLOAD_REPORT',
    targetId: report.id, targetName: report.title,
    folderId: params.id, folderName: folder.name,
  })

  return NextResponse.json({ report }, { status: 201 })
}
