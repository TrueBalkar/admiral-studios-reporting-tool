import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const components = [
  {
    type: 'HEADER',
    name: 'Stats Bar',
    description: 'Dark header with title, subtitle, and a row of 3–6 KPI stats separated by vertical dividers. The original style guide header.',
    isDefault: true,
    htmlTemplate: `<header class="report-header">
  <div style="max-width:1100px; margin:0 auto;">
    <h1>{{title}}</h1>
    <p class="subtitle mono">{{subtitle}}</p>
    <div class="header-stats">
      {{stats}}
    </div>
  </div>
</header>`,
    cssExtra: '',
  },
  {
    type: 'NAV',
    name: 'Sticky Scroll',
    description: 'Horizontal scrollable sticky navigation bar with section anchor links. The original style guide nav.',
    isDefault: true,
    htmlTemplate: `<nav class="toc">
  {{navLinks}}
</nav>`,
    cssExtra: '',
  },
  {
    type: 'FOOTER',
    name: 'Minimal Line',
    description: 'Single-line monospace footer with dataset info, date range, and small-sample caveat. Separated by a top border.',
    isDefault: true,
    htmlTemplate: `<footer class="report-footer">
  {{footerText}}
</footer>`,
    cssExtra: '',
  },
]

async function main() {
  for (const c of components) {
    await prisma.layoutComponent.upsert({
      where: { type_name: { type: c.type, name: c.name } },
      update: { htmlTemplate: c.htmlTemplate, description: c.description, cssExtra: c.cssExtra, isDefault: c.isDefault },
      create: c,
    })
    console.log(`  ✓ ${c.type}: ${c.name}`)
  }
  console.log('Layout seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
