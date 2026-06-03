import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { notify, notifyRole } from '@/lib/notifications'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({
    where: { id: params.id },
    include: { shares: { include: { user: { select: { id: true, name: true, email: true } } } } },
  })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role !== 'ADMIN' && folder.createdById !== user.userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ shares: folder.shares })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role !== 'ADMIN' && folder.createdById !== user.userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { shareType, roleTarget, userId } = await req.json()

  if (shareType === 'ROLE' && roleTarget) {
    const existing = await prisma.folderShare.findFirst({ where: { folderId: params.id, shareType: 'ROLE', roleTarget } })
    if (!existing) {
      await prisma.folderShare.create({ data: { folderId: params.id, shareType: 'ROLE', roleTarget } })
      notifyRole({ role: roleTarget, excludeUserId: user.userId, type: 'FOLDER_SHARED', title: `Folder shared with you`, body: `"${folder.name}" is now accessible to ${roleTarget}`, link: `/folders/${folder.id}` })
    }
  } else if (shareType === 'USER' && userId) {
    const existing = await prisma.folderShare.findFirst({ where: { folderId: params.id, shareType: 'USER', userId } })
    if (!existing) {
      await prisma.folderShare.create({ data: { folderId: params.id, shareType: 'USER', userId } })
      if (userId !== user.userId) {
        notify({ userId, type: 'FOLDER_SHARED', title: `Folder shared with you`, body: `${user.name} shared "${folder.name}" with you`, link: `/folders/${folder.id}` })
      }
    }
  } else {
    return NextResponse.json({ error: 'Invalid share target' }, { status: 400 })
  }

  const shares = await prisma.folderShare.findMany({
    where: { folderId: params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ shares })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role !== 'ADMIN' && folder.createdById !== user.userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { shareId } = await req.json()
  await prisma.folderShare.delete({ where: { id: shareId } })
  return NextResponse.json({ ok: true })
}
