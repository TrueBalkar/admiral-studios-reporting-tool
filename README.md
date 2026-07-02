# Admiral Studios Reporting Tool — Python Backend Branch

A Notion-style platform for storing, organizing, viewing, and sharing reports (HTML, Markdown, Excel, Figma/Sheets/links) with role-based access control, report theming, and swappable layout components.

> **This branch (`python-backend`) replaces the original Next.js API-routes + Prisma backend with a standalone FastAPI + SQLAlchemy + PostgreSQL service.** The Next.js app becomes a pure frontend that proxies all `/api/*` calls to this backend. See `main` for the original all-in-one Next.js/Prisma version.

## Architecture

```
┌─────────────────────┐        /api/* (proxied)        ┌──────────────────────┐
│  Next.js 14 frontend │ ──────────────────────────────▶ │   FastAPI backend     │
│  (Vercel)             │  next.config.js rewrites        │   (Contabo VPS,       │
│                        │  — same-origin from the         │   Docker Compose)     │
│                        │    browser's point of view      │                       │
└─────────────────────┘                                  └───────────┬───────────┘
                                                                       │ asyncpg
                                                            ┌──────────▼──────────┐
                                                            │  PostgreSQL 16       │
                                                            └──────────────────────┘
```

The frontend never talks to Postgres directly. Every `fetch('/api/...')`, `<iframe src="/api/...">`, and download link in the frontend is transparently rewritten by Next.js to the FastAPI backend — **no frontend code needed to change** when the backend moved from Next.js API routes to Python.

## Tech stack

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Alembic, passlib (bcrypt), python-jose (JWT), pandas/openpyxl (Excel)
**Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TipTap, react-markdown, SheetJS (`xlsx`)
**Database:** PostgreSQL 16
**Hosting:** Contabo VPS via Docker Compose (backend + Postgres) + Vercel (frontend)

## Local development

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate    # macOS/Linux

pip install -r requirements.txt
cp .env.example .env           # edit JWT_SECRET

# Start Postgres (via Docker) — or point DATABASE_URL at your own instance
docker compose up -d db        # from the repo root, in another terminal

alembic upgrade head
python -m app.seed             # creates demo users/folders/themes

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
# from the repo root
npm install
cp .env.example .env.local      # BACKEND_URL=http://localhost:8000, JWT_SECRET (same as backend)
npm run dev
```

Open http://localhost:3000 — login with `admin@crm.com` / `admin123`.

### 3. Or run everything with Docker Compose

```bash
docker compose up --build       # starts Postgres + FastAPI backend
# then run the frontend separately with `npm run dev` (Vercel doesn't run in Docker)
```

The `docker-compose.yml` covers Postgres + the backend only — the frontend is meant to run via `next dev` locally or be deployed to Vercel; it isn't containerized.

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@crm.com | admin123 | Admin |
| sales@crm.com | sales123 | Sales |
| sdr@crm.com   | sdr123   | SDR   |
| dev@crm.com   | dev123   | Dev   |

## Deploying

### Backend → Contabo VPS

1. Copy the `backend/` directory (and `docker-compose.yml` at the repo root) to the VPS.
2. Set real values in `backend/.env` (`JWT_SECRET`, `DATABASE_URL` if not using the bundled Postgres container, `CORS_ORIGINS`).
3. `docker compose up -d --build` — this starts Postgres 16 + the FastAPI backend (the container runs `alembic upgrade head` automatically on startup, then `uvicorn`).
4. Put a reverse proxy (nginx / Caddy / Traefik) in front of the backend container for TLS termination on a domain, e.g. `api.yourdomain.com`.
5. Run `docker compose exec backend python -m app.seed` once to create the demo data (optional — skip in a real deployment and create your own admin user instead).

### Frontend → Vercel

1. Import the repo into Vercel, deploy the `python-backend` branch.
2. Set environment variables in the Vercel project:
   - `BACKEND_URL` = your backend's public URL (e.g. `https://api.yourdomain.com`) — **not** prefixed with `NEXT_PUBLIC_`, it's only read server-side by `next.config.js`.
   - `JWT_SECRET` = same value as the backend's `JWT_SECRET`.
3. Deploy.

### Production domain setup (important)

The auth cookie is set by the **backend** when you log in (the request goes through the Next.js rewrite, so from the browser's perspective it's same-origin with the frontend — no CORS or cross-site cookie issues for API calls). However, Next.js **middleware** (which gates page navigation, e.g. redirecting to `/login`) runs on the frontend and reads the cookie directly from the incoming browser request — this works automatically in local dev (both on `localhost`, different ports — cookies are host-scoped, not port-scoped) and in production **as long as the cookie is visible to the frontend's domain**, which happens automatically since the Next.js rewrite makes login requests appear same-origin to the browser. No special domain configuration is required for the common case of frontend-only + proxied API.

If you ever call the backend **directly** from the browser (bypassing the Next.js rewrite — e.g. a separate mobile client, or direct API testing), you'll need proper CORS (`CORS_ORIGINS` in `backend/.env`) and `credentials: 'include'` on those requests.

## Database migrations

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

The initial migration (`alembic/versions/0001_initial_schema.py`) is hand-written to avoid requiring a live database during generation — all migrations after it can be autogenerated normally against a running Postgres instance.

## Features

- **Authentication** — JWT in httpOnly cookies, role-based access
- **Dynamic roles** — admins create/rename/delete roles and assign them to users
- **Folders & subfolders** — one level of nesting, color coding, collapsible sidebar tree
- **Reports** — upload `.html` / `.md` / `.xlsx` files (or drag & drop), or add links (Figma, Google Sheets, or any URL). View HTML in a sandboxed iframe, render Markdown, preview Excel as a table, embed Figma/Sheets/links
- **Report theming** — swap the visual style of "styleable" HTML reports live via CSS-variable-driven themes (Default / Dark Executive / Corporate Blue), no regeneration needed
- **Layout components** — swap header/nav/footer independently of theme (e.g. sticky-scroll nav vs. sidebar TOC) for styleable reports
- **Access control** — share folders with a whole role or a specific user; subfolders inherit parent access and can add their own
- **Search** — global search across folder names, report titles, tags, and full report content
- **Dashboard** — stats, GitHub-style activity heatmap, recently viewed, recent reports, activity feed, pinned folders, shared-with-me, stale-folder alerts, quick upload
- **Collaboration** — per-report comments, tags, view tracking, version history, public share links (optional password + expiry)
- **Notifications** — in-app bell for shares and comments
- **Admin** — user management, role management, paginated audit log with CSV export
- **Bulk operations** — multi-select reports to delete or move

## Notes

- This is a fork focused on the backend architecture migration — not hardened for production (rate limiting, request validation depth, structured logging, etc. would need attention before real production use).
- LLM (Anthropic SDK) and Telegram Bot delivery were intentionally left out of this pass — the router/service structure makes them straightforward to add later as `backend/app/routers/llm.py` and `backend/app/services/telegram.py`.
