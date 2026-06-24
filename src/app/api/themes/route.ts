import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const themes = await prisma.reportTheme.findMany({
    select: { id: true, name: true, description: true, isDefault: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ themes })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, cssContent } = await req.json()
  if (!name?.trim() || !cssContent?.trim()) return NextResponse.json({ error: 'Name and CSS required' }, { status: 400 })

  const theme = await prisma.reportTheme.create({
    data: { name: name.trim(), description: description?.trim() || null, cssContent },
  })
  return NextResponse.json({ theme }, { status: 201 })
}
