# Admiral Studios Reporting Tool

A Notion-style internal platform for storing, organizing, viewing, and sharing **HTML** and **Markdown** reports with role-based access control. Built as a proof of concept.

## Features

- **Authentication** — JWT in httpOnly cookies, role-based access
- **Dynamic roles** — admins create/rename/delete roles and assign them to users
- **Folders & subfolders** — one level of nesting, color coding, collapsible sidebar tree
- **Reports** — upload `.html` / `.md` files (or drag & drop), view HTML in a sandboxed iframe, render Markdown, edit Markdown in a split-pane editor
- **Access control** — share folders with a whole role or a specific user; subfolders inherit parent access and can add their own
- **Search** — global search across folder names, report titles, tags, and full report content
- **Dashboard** — stats, GitHub-style activity heatmap (week/month/3-month/year), recently viewed, recent reports, activity feed, pinned folders, shared-with-me, stale-folder alerts, quick upload
- **Collaboration** — per-report comments, tags, view tracking, version history (re-upload + restore), and public share links (optional password + expiry)
- **Notifications** — in-app bell for shares and comments
- **Admin** — user management, role management, paginated audit log with CSV export
- **Bulk operations** — multi-select reports to delete or move

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + React 18
- Tailwind CSS
- Prisma ORM + SQLite
- [TipTap](https://tiptap.dev/) (Markdown editor) + react-markdown
- jose (JWT) + bcryptjs

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
#   then edit JWT_SECRET

# 3. Set up the database
npx prisma db push
npm run db:seed

# 4. Run in development
npm run dev
#   open http://localhost:3000
```

### Production build

```bash
npm run build
npm run start
```

## Demo accounts

After seeding, these accounts are available:

| Email | Password | Role |
|-------|----------|------|
| admin@crm.com | admin123 | Admin |
| sales@crm.com | sales123 | Sales |
| sdr@crm.com   | sdr123   | SDR   |
| dev@crm.com   | dev123   | Dev   |

## Notes

- The SQLite database (`dev.db`) is git-ignored. Run `npx prisma db push && npm run db:seed` to create and populate it.
- This is a proof of concept — not hardened for production deployment.
