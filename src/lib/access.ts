import { prisma } from './db'

export async function hasAccessToFolder(folderId: string, userId: string, role: string): Promise<boolean> {
  if (role === 'ADMIN') return true
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { shares: true, parent: { include: { shares: true } } },
  })
  if (!folder) return false
  if (folder.createdById === userId) return true
  if (folder.shares.some(s => (s.shareType === 'USER' && s.userId === userId) || (s.shareType === 'ROLE' && s.roleTarget === role))) return true
  if (folder.parent) {
    if (folder.parent.createdById === userId) return true
    if (folder.parent.shares.some(s => (s.shareType === 'USER' && s.userId === userId) || (s.shareType === 'ROLE' && s.roleTarget === role))) return true
  }
  return false
}
