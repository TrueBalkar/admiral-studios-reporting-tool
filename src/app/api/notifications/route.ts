import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const unreadCount = await prisma.notification.count({ where: { userId: user.userId, read: false } })
  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (id === 'all') {
    await prisma.notification.updateMany({ where: { userId: user.userId, read: false }, data: { read: true } })
  } else {
    await prisma.notification.updateMany({ where: { id, userId: user.userId }, data: { read: true } })
  }
  return NextResponse.json({ ok: true })
}
