import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { hasAccessToFolder } from '@/lib/access'
import { recordActivity } from '@/lib/activity'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ok = await hasAccessToFolder(params.id, user.userId, user.role)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const reports = await prisma.report.findMany({
    where: { folderId: params.id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ reports })
}

const LINK_KINDS = ['FIGMA', 'GSHEET', 'LINK']

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder = await prisma.folder.findUnique({ where: { id: params.id } })
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ok = await hasAccessToFolder(params.id, user.userId, user.role)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let title = ''
  let fileType = 'HTML'
  let fileName = ''
  let content = ''
  let formData: FormData | null = null

  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    // Link report (Figma / Google Sheet / generic URL)
    const body = await req.json()
    title = (body.title || '').trim()
    const url = (body.url || '').trim()
    const kind = (body.linkKind || 'LINK').toUpperCase()
    if (!title || !url) return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 })
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
    if (!LINK_KINDS.includes(kind)) return NextResponse.json({ error: 'Invalid link type' }, { status: 400 })
    fileType = kind
    content = url
    try { fileName = new URL(url).hostname } catch { fileName = url }
  } else {
    // File upload (HTML / Markdown / Excel)
    formData = await req.formData()
    title = ((formData.get('title') as string) || '').trim()
    const file = formData.get('file') as File | null
    if (!title || !file) return NextResponse.json({ error: 'Title and file are required' }, { status: 400 })

    const name = file.name.toLowerCase()
    const isHtml = name.endsWith('.html') || file.type === 'text/html'
    const isMd   = name.endsWith('.md')   || file.type === 'text/markdown'
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'

    if (!isHtml && !isMd && !isXlsx)
      return NextResponse.json({ error: 'Only .html, .md, and .xlsx files are allowed' }, { status: 400 })

    fileName = file.name
    if (isXlsx) {
      fileType = 'XLSX'
      content = Buffer.from(await file.arrayBuffer()).toString('base64')
    } else {
      fileType = isMd ? 'MD' : 'HTML'
      content = await file.text()
    }
  }

  // Check for styleable flag (sent via formData for file uploads)
  let styleable = false
  let themeId: string | null = null
  if (formData) {
    const styleableField = formData.get('styleable')
    styleable = styleableField === 'true' || styleableField === '1'
  }

  // Auto-assign default theme for styleable reports
  if (styleable && fileType === 'HTML') {
    const defaultTheme = await prisma.reportTheme.findFirst({ where: { isDefault: true } })
    if (defaultTheme) themeId = defaultTheme.id
  }

  const report = await prisma.report.create({
    data: { title, folderId: params.id, uploadedById: user.userId, fileName, fileType, content, styleable, themeId },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  recordActivity({
    userId: user.userId, userName: user.name, action: 'UPLOAD_REPORT',
    targetId: report.id, targetName: report.title,
    folderId: params.id, folderName: folder.name,
  })

  return NextResponse.json({ report }, { status: 201 })
}
