import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, canDeleteFolder } from '@/lib/auth'
import { recordActivity } from '@/lib/activity'
import { hasAccessToFolder } from '@/lib/access'

const folderInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  parent: { select: { id: true, name: true, color: true } },
  shares: { include: { user: { select: { id: true, name: true, email: true } } } },
  _count: { select: { reports: true, children: true } },
  children: {
    include: {
      createdBy: { select: { id: true, name: true } },
      shares: true,
      _count: { select: { reports: true, children: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id }, include: folderInclude })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ok = await hasAccessToFolder(params.id, user.userId, user.role)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ folder })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canDeleteFolder(user, folder.createdById)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, type, description, color } = await req.json()
  const updated = await prisma.folder.update({
    where: { id: params.id },
    data: {
      name: name?.trim() || folder.name,
      type: type || folder.type,
      description: description?.trim() ?? folder.description,
      ...(color !== undefined ? { color: color || null } : {}),
    },
    include: folderInclude,
  })
  return NextResponse.json({ folder: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canDeleteFolder(user, folder.createdById)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  recordActivity({ userId: user.userId, userName: user.name, action: 'DELETE_FOLDER', targetId: folder.id, targetName: folder.name })
  await prisma.folder.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
