/**
 * Render a layout component template by replacing {{placeholders}} with data.
 * Placeholders: {{title}}, {{subtitle}}, {{stats}}, {{navLinks}}, {{footerText}}
 */
export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '')
}

/**
 * Extract header/nav/footer from a styleable report's HTML body, returning:
 *  - header: everything in <header class="report-header">...</header>
 *  - nav: everything in <nav class="toc">...</nav>
 *  - footer: everything in <footer class="report-footer">...</footer>
 *  - body: everything between nav and footer (the main content)
 */
export function splitReportHtml(html: string): {
  header: string
  nav: string
  body: string
  footer: string
  scripts: string
} {
  let header = '', nav = '', body = '', footer = '', scripts = ''

  // Extract header
  const headerMatch = html.match(/<header\s+class="report-header"[\s\S]*?<\/header>/i)
  if (headerMatch) header = headerMatch[0]

  // Extract nav
  const navMatch = html.match(/<nav\s+class="toc"[\s\S]*?<\/nav>/i)
  if (navMatch) nav = navMatch[0]

  // Extract footer
  const footerMatch = html.match(/<footer\s+class="report-footer"[\s\S]*?<\/footer>/i)
  if (footerMatch) footer = footerMatch[0]

  // Extract scripts (Chart.js etc.)
  const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi)
  if (scriptMatches) scripts = scriptMatches.join('\n')

  // Body = everything that isn't header, nav, footer, or scripts
  body = html
  if (header) body = body.replace(header, '')
  if (nav) body = body.replace(nav, '')
  if (footer) body = body.replace(footer, '')
  if (scriptMatches) scriptMatches.forEach(s => { body = body.replace(s, '') })
  body = body.trim()

  return { header, nav, body, footer, scripts }
}

/**
 * Assemble a full styleable report from its parts.
 * If a layout component template is provided, it REPLACES the corresponding
 * part extracted from the report HTML. Otherwise the original part is used.
 */
export function assembleReport(parts: {
  header: string
  nav: string
  body: string
  footer: string
  scripts: string
  overrides?: {
    header?: string
    nav?: string
    footer?: string
  }
}): string {
  const h = parts.overrides?.header ?? parts.header
  const n = parts.overrides?.nav ?? parts.nav
  const f = parts.overrides?.footer ?? parts.footer
  return `${h}\n${n}\n${parts.body}\n${f}\n${parts.scripts}`
}
