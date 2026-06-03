import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ folders: [], reports: [] })

  const isAdmin = user.role === 'ADMIN'
  const accessFilter = isAdmin ? {} : {
    OR: [
      { createdById: user.userId },
      { shares: { some: { shareType: 'USER', userId: user.userId } } },
      { shares: { some: { shareType: 'ROLE', roleTarget: user.role } } },
      { parent: { OR: [
        { createdById: user.userId },
        { shares: { some: { shareType: 'USER', userId: user.userId } } },
        { shares: { some: { shareType: 'ROLE', roleTarget: user.role } } },
      ]}},
    ],
  }

  const folders = await prisma.folder.findMany({
    where: { AND: [accessFilter, { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] }] },
    include: { _count: { select: { reports: true } } },
    take: 10,
  })

  const accessibleFolderIds = isAdmin
    ? (await prisma.folder.findMany({ select: { id: true } })).map(f => f.id)
    : (await prisma.folder.findMany({ where: accessFilter, select: { id: true } })).map(f => f.id)

  const reports = await prisma.report.findMany({
    where: {
      folderId: { in: accessibleFolderIds },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { tags: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },  // full-text search inside content
      ],
    },
    include: {
      folder: { select: { id: true, name: true, type: true } },
      uploadedBy: { select: { name: true } },
    },
    take: 15,
  })

  return NextResponse.json({ folders, reports })
}
