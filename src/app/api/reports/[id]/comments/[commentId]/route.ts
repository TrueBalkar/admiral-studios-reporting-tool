import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comment = await prisma.comment.findUnique({ where: { id: params.commentId } })
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.userId !== user.userId && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.comment.delete({ where: { id: params.commentId } })
  return NextResponse.json({ ok: true })
}
