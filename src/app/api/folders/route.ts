import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { recordActivity } from '@/lib/activity'

const folderInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  shares: true,
  _count: { select: { reports: true, children: true } },
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let folders
  if (user.role === 'ADMIN') {
    folders = await prisma.folder.findMany({
      include: folderInclude,
      orderBy: { createdAt: 'desc' },
    })
  } else {
    folders = await prisma.folder.findMany({
      where: {
        OR: [
          { createdById: user.userId },
          { shares: { some: { shareType: 'USER', userId: user.userId } } },
          { shares: { some: { shareType: 'ROLE', roleTarget: user.role } } },
          // subfolders whose parent is accessible
          {
            parent: {
              OR: [
                { createdById: user.userId },
                { shares: { some: { shareType: 'USER', userId: user.userId } } },
                { shares: { some: { shareType: 'ROLE', roleTarget: user.role } } },
              ],
            },
          },
        ],
      },
      include: folderInclude,
      orderBy: { createdAt: 'desc' },
    })
  }

  return NextResponse.json({ folders })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type, description, parentId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // Validate parentId if provided (must exist + user must have access)
  if (parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: parentId } })
    if (!parent) return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
    if (parent.parentId) return NextResponse.json({ error: 'Cannot nest more than one level deep' }, { status: 400 })
  }

  const folder = await prisma.folder.create({
    data: {
      name: name.trim(),
      type: type || 'CUSTOM',
      description: description?.trim() || null,
      createdById: user.userId,
      parentId: parentId || null,
    },
    include: folderInclude,
  })

  recordActivity({
    userId: user.userId,
    userName: user.name,
    action: parentId ? 'CREATE_SUBFOLDER' : 'CREATE_FOLDER',
    targetId: folder.id,
    targetName: folder.name,
  })

  return NextResponse.json({ folder }, { status: 201 })
}
