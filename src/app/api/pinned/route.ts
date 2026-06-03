import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pinned = await prisma.pinnedFolder.findMany({
    where: { userId: user.userId },
    include: {
      folder: {
        include: {
          _count: { select: { reports: true } },
          createdBy: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ pinned })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { folderId } = await req.json()
  const pin = await prisma.pinnedFolder.upsert({
    where: { userId_folderId: { userId: user.userId, folderId } },
    update: {},
    create: { userId: user.userId, folderId },
  })
  return NextResponse.json({ pin })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { folderId } = await req.json()
  await prisma.pinnedFolder.deleteMany({ where: { userId: user.userId, folderId } })
  return NextResponse.json({ ok: true })
}
