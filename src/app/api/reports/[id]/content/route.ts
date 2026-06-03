import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { folder: { include: { shares: true } } },
  })

  if (!report) return new NextResponse('Not found', { status: 404 })

  const folder = report.folder
  const hasAccess =
    user.role === 'ADMIN' ||
    folder.createdById === user.userId ||
    report.uploadedById === user.userId ||
    folder.shares.some(
      (s) =>
        (s.shareType === 'USER' && s.userId === user.userId) ||
        (s.shareType === 'ROLE' && s.roleTarget === user.role)
    )

  if (!hasAccess) return new NextResponse('Forbidden', { status: 403 })

  return new NextResponse(report.content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
