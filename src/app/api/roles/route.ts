import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const roles = await prisma.customRole.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ roles })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  const trimmed = name?.trim().toUpperCase()
  if (!trimmed) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const existing = await prisma.customRole.findUnique({ where: { name: trimmed } })
  if (existing) return NextResponse.json({ error: 'Role already exists' }, { status: 409 })

  const role = await prisma.customRole.create({ data: { name: trimmed } })
  return NextResponse.json({ role }, { status: 201 })
}
