import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await req.json()
  if (!name?.trim() || !email?.trim() || !password)
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })

  const validRole = await prisma.customRole.findUnique({ where: { name: role || 'SALES' } })
  if (!validRole) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const newUser = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), password: bcrypt.hashSync(password, 10), role: validRole.name },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return NextResponse.json({ user: newUser }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, role } = await req.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

  const validRole = await prisma.customRole.findUnique({ where: { name: role } })
  if (!validRole) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  // Protect: cannot remove ADMIN role from the last admin
  if (validRole.name !== 'ADMIN') {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (targetUser?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) return NextResponse.json({ error: 'Cannot remove role from last admin' }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return NextResponse.json({ user: updated })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (userId === user.userId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ ok: true })
}
