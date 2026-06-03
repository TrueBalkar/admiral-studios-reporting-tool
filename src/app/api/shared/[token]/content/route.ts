import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const link = await prisma.publicShareLink.findUnique({
    where: { token: params.token },
    include: { report: { select: { content: true, fileType: true } } },
  })

  if (!link) return new NextResponse('Not found', { status: 404 })
  if (link.expiresAt && link.expiresAt < new Date()) return new NextResponse('Expired', { status: 410 })

  if (link.password) {
    const { password } = await req.json().catch(() => ({ password: '' }))
    if (!password || !bcrypt.compareSync(password, link.password))
      return new NextResponse('Unauthorized', { status: 401 })
  }

  const contentType = link.report.fileType === 'MD' ? 'text/plain' : 'text/html'
  return new NextResponse(link.report.content, { headers: { 'Content-Type': `${contentType}; charset=utf-8` } })
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  // For iframe src (HTML only, no password)
  const link = await prisma.publicShareLink.findUnique({
    where: { token: params.token },
    include: { report: { select: { content: true, fileType: true } } },
  })
  if (!link || link.password) return new NextResponse('Not found', { status: 404 })
  if (link.expiresAt && link.expiresAt < new Date()) return new NextResponse('Expired', { status: 410 })
  return new NextResponse(link.report.content, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
