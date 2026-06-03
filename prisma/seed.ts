import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  // Seed built-in and default roles
  await prisma.customRole.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN', isBuiltIn: true, isDefault: false } })
  await prisma.customRole.upsert({ where: { name: 'SALES' }, update: {}, create: { name: 'SALES', isBuiltIn: false, isDefault: true } })
  await prisma.customRole.upsert({ where: { name: 'SDR' },   update: {}, create: { name: 'SDR',   isBuiltIn: false, isDefault: false } })
  await prisma.customRole.upsert({ where: { name: 'DEV' },   update: {}, create: { name: 'DEV',   isBuiltIn: false, isDefault: false } })

  const admin = await prisma.user.upsert({ where: { email: 'admin@crm.com' }, update: {}, create: { name: 'Admin User',  email: 'admin@crm.com', password: hash('admin123'), role: 'ADMIN' } })
  const sales = await prisma.user.upsert({ where: { email: 'sales@crm.com' }, update: {}, create: { name: 'Sales User',  email: 'sales@crm.com', password: hash('sales123'), role: 'SALES' } })
  const sdr   = await prisma.user.upsert({ where: { email: 'sdr@crm.com'   }, update: {}, create: { name: 'SDR User',    email: 'sdr@crm.com',   password: hash('sdr123'),   role: 'SDR'   } })
  await        prisma.user.upsert({ where: { email: 'dev@crm.com'   }, update: {}, create: { name: 'Dev User',    email: 'dev@crm.com',   password: hash('dev123'),   role: 'DEV'   } })

  const salesFolder = await prisma.folder.upsert({ where: { id: 'seed-folder-sales' }, update: {}, create: { id: 'seed-folder-sales', name: 'Q1 Sales Reports',    type: 'SALES', description: 'Quarterly sales performance reports',      createdById: admin.id } })
  const sdrFolder   = await prisma.folder.upsert({ where: { id: 'seed-folder-sdr'   }, update: {}, create: { id: 'seed-folder-sdr',   name: 'SDR Pipeline Reports', type: 'SDR',   description: 'SDR team pipeline and activity reports',    createdById: admin.id } })
  await              prisma.folder.upsert({ where: { id: 'seed-folder-dev'   }, update: {}, create: { id: 'seed-folder-dev',   name: 'Dev Sprint Reports',  type: 'DEV',   description: 'Development sprint and velocity reports',  createdById: admin.id } })

  // Sub-folder example
  await prisma.folder.upsert({ where: { id: 'seed-folder-sales-sub' }, update: {}, create: { id: 'seed-folder-sales-sub', name: 'Monthly Breakdowns', type: 'SALES', description: 'Month-by-month sales breakdowns', createdById: admin.id, parentId: salesFolder.id } })

  await prisma.folderShare.upsert({ where: { id: 'seed-share-sales-role'     }, update: {}, create: { id: 'seed-share-sales-role',     folderId: salesFolder.id, shareType: 'ROLE', roleTarget: 'SALES' } })
  await prisma.folderShare.upsert({ where: { id: 'seed-share-sdr-role'       }, update: {}, create: { id: 'seed-share-sdr-role',       folderId: sdrFolder.id,   shareType: 'ROLE', roleTarget: 'SDR'   } })
  await prisma.folderShare.upsert({ where: { id: 'seed-share-sdr-sales-user' }, update: {}, create: { id: 'seed-share-sdr-sales-user', folderId: sdrFolder.id,   shareType: 'USER', userId: sales.id     } })

  console.log('Seed complete.')
  console.log('  admin@crm.com / admin123')
  console.log('  sales@crm.com / sales123')
  console.log('  sdr@crm.com   / sdr123')
  console.log('  dev@crm.com   / dev123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
