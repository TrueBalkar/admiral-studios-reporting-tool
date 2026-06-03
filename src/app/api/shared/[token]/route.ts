import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const link = await prisma.publicShareLink.findUnique({
    where: { token: params.token },
    include: { report: { select: { id: true, title: true, fileType: true } } },
  })

  if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  if (link.expiresAt && link.expiresAt < new Date()) return NextResponse.json({ error: 'Link has expired' }, { status: 410 })

  if (link.password) {
    const { password } = await req.json().catch(() => ({ password: '' }))
    if (!password || !bcrypt.compareSync(password, link.password))
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  await prisma.publicShareLink.update({ where: { token: params.token }, data: { viewCount: { increment: 1 } } })

  return NextResponse.json({ title: link.report.title, fileType: link.report.fileType })
}
