import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const count = await prisma.reportView.count({ where: { reportId: params.id } })
  const unique = await prisma.reportView.groupBy({ by: ['userId'], where: { reportId: params.id } })
  return NextResponse.json({ totalViews: count, uniqueViewers: unique.length })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.reportView.create({ data: { userId: user.userId, reportId: params.id } })
  return NextResponse.json({ ok: true })
}
