import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const theme = await prisma.reportTheme.findUnique({
    where: { id: params.id },
    select: { cssContent: true },
  })
  if (!theme) return new NextResponse('Not found', { status: 404 })

  return new NextResponse(theme.cssContent, {
    headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
