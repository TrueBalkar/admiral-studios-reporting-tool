import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { recordActivity } from '@/lib/activity'

async function checkAccess(reportId: string, userId: string, role: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      folder: { include: { shares: true, parent: { include: { shares: true } } } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })
  if (!report) return null
  if (role === 'ADMIN') return report
  const folder = report.folder
  const checkFolder = (f: typeof folder) =>
    f.createdById === userId ||
    f.shares.some(s => (s.shareType === 'USER' && s.userId === userId) || (s.shareType === 'ROLE' && s.roleTarget === role))

  if (report.uploadedById === userId || checkFolder(folder)) return report
  if (folder.parent && checkFolder(folder.parent as typeof folder)) return report
  return null
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await checkAccess(params.id, user.userId, user.role)
  if (!report) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  const { content: _, folder, ...meta } = report
  return NextResponse.json({ report: { ...meta, folder: { id: folder.id, name: folder.name, type: folder.type } } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await checkAccess(params.id, user.userId, user.role)
  if (!report) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  const canEdit =
    user.role === 'ADMIN' ||
    report.uploadedById === user.userId ||
    report.folder.createdById === user.userId

  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content, title, themeId } = await req.json()
  const updated = await prisma.report.update({
    where: { id: params.id },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(themeId !== undefined ? { themeId } : {}),
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  recordActivity({
    userId: user.userId, userName: user.name, action: 'EDIT_REPORT',
    targetId: report.id, targetName: report.title,
    folderId: report.folderId, folderName: report.folder.name,
  })

  const { content: __, ...meta } = updated
  return NextResponse.json({ report: meta })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { folder: true } })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canDelete =
    user.role === 'ADMIN' ||
    report.uploadedById === user.userId ||
    report.folder.createdById === user.userId

  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  recordActivity({ userId: user.userId, userName: user.name, action: 'DELETE_REPORT', targetId: report.id, targetName: report.title, folderId: report.folderId, folderName: report.folder.name })
  await prisma.report.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
