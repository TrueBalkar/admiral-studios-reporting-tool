import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const role = await prisma.customRole.findUnique({ where: { id: params.id } })
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role.isBuiltIn) return NextResponse.json({ error: 'Cannot edit built-in role' }, { status: 400 })

  const { name, isDefault } = await req.json()

  if (isDefault === true) {
    // Unset any existing default first
    await prisma.customRole.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }

  const updated = await prisma.customRole.update({
    where: { id: params.id },
    data: {
      ...(name ? { name: name.trim().toUpperCase() } : {}),
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    },
  })
  return NextResponse.json({ role: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const role = await prisma.customRole.findUnique({ where: { id: params.id } })
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role.isBuiltIn) return NextResponse.json({ error: 'Cannot delete built-in role' }, { status: 400 })

  const defaultRole = await prisma.customRole.findFirst({ where: { isDefault: true } })
  const fallbackRole = defaultRole?.name ?? 'SALES'

  // Reset affected users to default role
  await prisma.user.updateMany({ where: { role: role.name }, data: { role: fallbackRole } })

  await prisma.customRole.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true, resetTo: fallbackRole })
}
