import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { notify } from '@/lib/notifications'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comments = await prisma.comment.findMany({
    where: { reportId: params.id },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const report = await prisma.report.findUnique({ where: { id: params.id }, select: { id: true, title: true, folderId: true, uploadedById: true } })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comment = await prisma.comment.create({
    data: { reportId: params.id, userId: user.userId, content: content.trim() },
    include: { user: { select: { id: true, name: true, role: true } } },
  })

  if (report.uploadedById !== user.userId) {
    notify({
      userId: report.uploadedById,
      type: 'COMMENT_ADDED',
      title: `New comment on "${report.title}"`,
      body: `${user.name}: ${content.trim().slice(0, 80)}`,
      link: `/folders/${report.folderId}/reports/${report.id}`,
    })
  }

  return NextResponse.json({ comment }, { status: 201 })
}
