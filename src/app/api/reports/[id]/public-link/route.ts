import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const links = await prisma.publicShareLink.findMany({
    where: { reportId: params.id },
    select: { id: true, token: true, expiresAt: true, viewCount: true, createdAt: true, password: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ links: links.map(l => ({ ...l, hasPassword: !!l.password, password: undefined })) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { folder: true } })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canShare = user.role === 'ADMIN' || report.uploadedById === user.userId || report.folder.createdById === user.userId
  if (!canShare) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { password, expiresInDays } = await req.json()
  const link = await prisma.publicShareLink.create({
    data: {
      reportId: params.id,
      createdById: user.userId,
      password: password ? bcrypt.hashSync(password, 10) : null,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
    },
  })
  return NextResponse.json({ token: link.token, link: `/shared/${link.token}` }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { linkId } = await req.json()
  await prisma.publicShareLink.deleteMany({ where: { id: linkId, reportId: params.id } })
  return NextResponse.json({ ok: true })
}
