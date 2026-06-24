import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const theme = await prisma.reportTheme.findUnique({ where: { id: params.id } })
  if (!theme) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ theme })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, cssContent, isDefault } = await req.json()

  if (isDefault === true) {
    await prisma.reportTheme.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }

  const updated = await prisma.reportTheme.update({
    where: { id: params.id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(cssContent ? { cssContent } : {}),
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    },
  })
  return NextResponse.json({ theme: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Unassign reports using this theme before deleting
  await prisma.report.updateMany({ where: { themeId: params.id }, data: { themeId: null } })
  await prisma.reportTheme.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
