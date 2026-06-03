import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getAuthUser, signJWT } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, currentPassword, newPassword } = await req.json()

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const updates: { name?: string; password?: string } = {}

  if (name?.trim()) updates.name = name.trim()

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    if (!bcrypt.compareSync(currentPassword, dbUser.password))
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    updates.password = bcrypt.hashSync(newPassword, 10)
  }

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data: updates,
    select: { id: true, name: true, email: true, role: true },
  })

  // Re-issue JWT with updated name
  const token = await signJWT({ userId: updated.id, email: updated.email, role: updated.role as 'ADMIN' | 'SALES' | 'SDR' | 'DEV', name: updated.name })
  const res = NextResponse.json({ user: updated })
  res.cookies.set('auth-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
  return res
}
