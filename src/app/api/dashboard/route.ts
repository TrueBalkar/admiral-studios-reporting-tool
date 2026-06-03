import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.role === 'ADMIN'

  const accessFilter = isAdmin ? {} : {
    OR: [
      { createdById: user.userId },
      { shares: { some: { shareType: 'USER', userId: user.userId } } },
      { shares: { some: { shareType: 'ROLE', roleTarget: user.role } } },
      { parent: { OR: [
        { createdById: user.userId },
        { shares: { some: { shareType: 'USER', userId: user.userId } } },
        { shares: { some: { shareType: 'ROLE', roleTarget: user.role } } },
      ]}},
    ],
  }

  const accessibleFolders = await prisma.folder.findMany({
    where: accessFilter,
    select: { id: true, name: true, type: true, color: true, createdById: true, updatedAt: true, parentId: true, createdAt: true,
      _count: { select: { reports: true } },
      shares: { select: { shareType: true, roleTarget: true, userId: true } },
    },
  })
  const accessibleFolderIds = accessibleFolders.map(f => f.id)

  // Stats
  const [reportCount, userCount] = await Promise.all([
    prisma.report.count({ where: { folderId: { in: accessibleFolderIds } } }),
    isAdmin ? prisma.user.count() : Promise.resolve(null),
  ])

  // Recent reports (last 8)
  const recentReports = await prisma.report.findMany({
    where: { folderId: { in: accessibleFolderIds } },
    include: {
      folder: { select: { id: true, name: true, type: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  // Activity feed (last 20)
  const activityFeed = await prisma.activity.findMany({
    where: isAdmin ? {} : { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { name: true } } },
  })

  // Heatmap: activities per day for last 365 days (org = all, me = current user)
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)

  const orgActivities = await prisma.activity.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  })
  const myActivities = await prisma.activity.findMany({
    where: { userId: user.userId, createdAt: { gte: since } },
    select: { createdAt: true },
  })

  const toDayKey = (d: Date) => d.toISOString().slice(0, 10)
  const buildHeatmap = (activities: { createdAt: Date }[]) => {
    const map: Record<string, number> = {}
    for (const a of activities) {
      const k = toDayKey(a.createdAt)
      map[k] = (map[k] || 0) + 1
    }
    return map
  }

  // Shared with me (not created by me)
  const sharedWithMe = accessibleFolders.filter(f =>
    f.createdById !== user.userId &&
    (f.shares.some(s =>
      (s.shareType === 'USER' && s.userId === user.userId) ||
      (s.shareType === 'ROLE' && s.roleTarget === user.role)
    ))
  )

  // Stale folders: accessible, older than 30 days, no report in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const staleRecentReportFolderIds = await prisma.report.findMany({
    where: { folderId: { in: accessibleFolderIds }, createdAt: { gte: thirtyDaysAgo } },
    select: { folderId: true },
  })
  const activeFolderIds = new Set(staleRecentReportFolderIds.map(r => r.folderId))

  const staleFolders = accessibleFolders.filter(f =>
    new Date(f.createdAt) < thirtyDaysAgo &&
    !activeFolderIds.has(f.id) &&
    f._count.reports > 0
  )

  // Recently viewed (last 5 distinct reports)
  const rawViews = await prisma.reportView.findMany({
    where: { userId: user.userId, reportId: { in: await prisma.report.findMany({ where: { folderId: { in: accessibleFolderIds } }, select: { id: true } }).then(rs => rs.map(r => r.id)) } },
    orderBy: { viewedAt: 'desc' },
    include: { report: { include: { folder: { select: { id: true, name: true, type: true } } } } },
  })
  const seen = new Set<string>()
  const recentlyViewed = rawViews.filter(v => { if (seen.has(v.reportId)) return false; seen.add(v.reportId); return true }).slice(0, 5)

  return NextResponse.json({
    stats: { folderCount: accessibleFolders.filter(f => !f.parentId).length, reportCount, userCount },
    recentReports,
    activityFeed,
    heatmap: { org: buildHeatmap(orgActivities), me: buildHeatmap(myActivities) },
    sharedWithMe: sharedWithMe.slice(0, 10),
    staleFolders: staleFolders.slice(0, 5),
    recentlyViewed: recentlyViewed.map(v => ({ id: v.reportId, title: v.report.title, fileType: v.report.fileType, folder: v.report.folder, viewedAt: v.viewedAt })),
  })
}
