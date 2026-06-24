import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const THEME_DIR = path.join(__dirname, '..', '..', 'Reports materials (AI generated)', 'Style guide', 'theme-system')

const themes = [
  { name: 'Default',        file: 'report-default.css',    desc: 'Warm editorial — off-white surfaces, Georgia serif, restrained data-dense aesthetic', isDefault: true },
  { name: 'Dark Executive', file: 'report-dark.css',       desc: 'Dark surfaces with light text — same semantic accents, adjusted for readability on dark backgrounds', isDefault: false },
  { name: 'Corporate Blue', file: 'report-corporate.css',  desc: 'Clean cold-toned professional palette with navy header and blue-grey neutrals', isDefault: false },
]

async function main() {
  // Read the master stylesheet (always needed as base)
  const masterCss = fs.readFileSync(path.join(THEME_DIR, 'report-default.css'), 'utf-8')

  for (const t of themes) {
    const themeCss = fs.readFileSync(path.join(THEME_DIR, t.file), 'utf-8')
    // For non-default themes, combine: master + override
    const fullCss = t.isDefault ? themeCss : `${masterCss}\n\n/* ── THEME OVERRIDE: ${t.name} ── */\n${themeCss}`

    await prisma.reportTheme.upsert({
      where: { name: t.name },
      update: { cssContent: fullCss, description: t.desc, isDefault: t.isDefault },
      create: { name: t.name, cssContent: fullCss, description: t.desc, isDefault: t.isDefault },
    })
    console.log(`  ✓ ${t.name}`)
  }
  console.log('Theme seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
