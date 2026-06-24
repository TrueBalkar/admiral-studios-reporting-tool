import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  const where = type ? { type: type.toUpperCase() } : {}

  const layouts = await prisma.layoutComponent.findMany({
    where,
    select: { id: true, type: true, name: true, description: true, isDefault: true, createdAt: true },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ layouts })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, name, description, htmlTemplate, cssExtra } = await req.json()
  if (!type || !name?.trim() || !htmlTemplate?.trim())
    return NextResponse.json({ error: 'Type, name, and htmlTemplate are required' }, { status: 400 })

  const validTypes = ['HEADER', 'NAV', 'FOOTER']
  if (!validTypes.includes(type.toUpperCase()))
    return NextResponse.json({ error: `Type must be one of: ${validTypes.join(', ')}` }, { status: 400 })

  const layout = await prisma.layoutComponent.create({
    data: { type: type.toUpperCase(), name: name.trim(), description: description?.trim() || null, htmlTemplate, cssExtra: cssExtra || '' },
  })
  return NextResponse.json({ layout }, { status: 201 })
}
