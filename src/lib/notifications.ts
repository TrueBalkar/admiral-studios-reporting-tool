import { prisma } from './db'

export type NotificationType = 'FOLDER_SHARED' | 'REPORT_UPLOADED' | 'COMMENT_ADDED'

export function notify(params: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}) {
  prisma.notification.create({ data: params }).catch(() => {})
}

export async function notifyRole(params: {
  role: string
  excludeUserId?: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}) {
  const users = await prisma.user.findMany({
    where: { role: params.role, ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}) },
    select: { id: true },
  })
  const { role: _, excludeUserId: __, ...notifData } = params
  await prisma.notification.createMany({
    data: users.map(u => ({ ...notifData, userId: u.id })),
  })
}
