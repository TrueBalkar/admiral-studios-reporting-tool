import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const layout = await prisma.layoutComponent.findUnique({ where: { id: params.id } })
  if (!layout) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ layout })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, htmlTemplate, cssExtra, isDefault } = await req.json()

  if (isDefault === true) {
    const current = await prisma.layoutComponent.findUnique({ where: { id: params.id } })
    if (current) await prisma.layoutComponent.updateMany({ where: { type: current.type, isDefault: true }, data: { isDefault: false } })
  }

  const updated = await prisma.layoutComponent.update({
    where: { id: params.id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(htmlTemplate ? { htmlTemplate } : {}),
      ...(cssExtra !== undefined ? { cssExtra: cssExtra || '' } : {}),
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    },
  })
  return NextResponse.json({ layout: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const layout = await prisma.layoutComponent.findUnique({ where: { id: params.id } })
  if (!layout) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Unassign from reports
  if (layout.type === 'HEADER') await prisma.report.updateMany({ where: { headerId: params.id }, data: { headerId: null } })
  if (layout.type === 'NAV')    await prisma.report.updateMany({ where: { navId: params.id },    data: { navId: null } })
  if (layout.type === 'FOOTER') await prisma.report.updateMany({ where: { footerId: params.id }, data: { footerId: null } })

  await prisma.layoutComponent.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
