"""
Seed demo data: roles, users, folders, shares, report themes, and layout
components. Run with:  python -m app.seed
"""
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.folder import Folder, FolderShare
from app.models.theme import LayoutComponent, ReportTheme
from app.models.user import CustomRole, User

DEFAULT_THEME_CSS = """
:root {
  --bg: #f7f6f3; --surface: #ffffff; --surface2: #f0ede8;
  --border: #e2ddd6; --border2: #ccc8c0;
  --text: #1a1916; --text2: #5a5750; --text3: #9a968f;
  --accent: #2b5fff; --accent-bg: #eef2ff;
  --green: #1a7f4b; --green-bg: #e6f6ee;
  --amber: #a05c00; --amber-bg: #fdf3e0;
  --red: #c0392b; --red-bg: #fdecea;
  --purple: #5b21b6; --purple-bg: #f3eeff;
  --font-serif: Georgia, serif; --font-mono: 'Courier New', monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-serif); font-size: 15px; line-height: 1.6; color: var(--text); background: var(--bg); }
.mono { font-family: var(--font-mono); }
a { color: inherit; text-decoration: none; }
.report-header { background: var(--text); color: #fff; padding: 3rem 2rem 2rem; }
.report-header h1 { font-size: 2rem; font-weight: normal; margin-bottom: 0.5rem; }
.report-header .subtitle { font-family: var(--font-mono); font-size: 0.85rem; color: #aaa; margin-bottom: 2rem; }
.header-stats { display: flex; flex-wrap: wrap; gap: 0; border-top: 1px solid #333; padding-top: 1.5rem; }
.header-stat { padding: 0 2rem 0 0; margin-right: 2rem; border-right: 1px solid #444; }
.header-stat:last-child { border-right: none; }
.header-stat .n { font-size: 1.8rem; font-weight: bold; font-family: var(--font-serif); }
.header-stat .l { font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin-top: 0.2rem; }
.toc { position: sticky; top: 0; z-index: 100; background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 2rem; overflow-x: auto; white-space: nowrap; }
.toc a { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text2); display: inline-block; padding: 0.75rem 0.75rem 0.75rem 0; margin-right: 0.5rem; border-bottom: 2px solid transparent; transition: border-color 0.15s; }
.toc a:hover { border-bottom-color: var(--accent); color: var(--text); }
.content { max-width: 1100px; margin: 0 auto; padding: 2rem; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } .header-stats { flex-direction: column; } }
.section { margin-bottom: 4rem; }
.section-head { display: flex; align-items: baseline; gap: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid var(--text); margin-bottom: 2rem; }
.section-num { font-family: var(--font-mono); font-size: 0.85rem; color: var(--text3); }
.section-head h2 { font-size: 1.3rem; font-weight: normal; }
.subsection { margin-bottom: 2.5rem; }
.subsection h3 { font-family: var(--font-mono); font-size: 0.9rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text2); margin-bottom: 1rem; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.metric-card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1.2rem 1.2rem 1rem; }
.metric-card .val { font-size: 1.8rem; font-weight: bold; font-family: var(--font-serif); }
.metric-card .label { font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text3); margin-top: 0.3rem; }
.metric-card .note { font-size: 0.82rem; color: var(--text2); margin-top: 0.4rem; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1.5rem; margin-bottom: 1rem; }
.insight { padding: 0.7rem 1rem; margin-bottom: 0.6rem; font-size: 0.9rem; border-radius: 2px; }
.insight.good { border-left: 3px solid var(--green); background: var(--green-bg); }
.insight.warn { border-left: 3px solid var(--amber); background: var(--amber-bg); }
.insight.bad { border-left: 3px solid var(--red); background: var(--red-bg); }
.insight.info { border-left: 3px solid var(--accent); background: var(--accent-bg); }
.insight.purple { border-left: 3px solid var(--purple); background: var(--purple-bg); }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th { background: var(--surface2); font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.6rem 0.75rem; text-align: left; border-bottom: 2px solid var(--border2); }
td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: top; }
tr:hover td { background: var(--surface2); }
td.num, th.num { text-align: right; }
.tag { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 2px; font-family: var(--font-mono); font-size: 0.72rem; font-weight: bold; }
.tag.green { background: var(--green-bg); color: var(--green); }
.tag.amber { background: var(--amber-bg); color: var(--amber); }
.tag.red { background: var(--red-bg); color: var(--red); }
.tag.blue { background: var(--accent-bg); color: var(--accent); }
.tag.purple { background: var(--purple-bg); color: var(--purple); }
.custom-legend { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text2); }
.legend-item { display: flex; align-items: center; gap: 0.4rem; }
.legend-dot { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
.recs-table td { vertical-align: middle; }
.recs-table td:first-child { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text3); font-weight: bold; }
.recs-table td:nth-child(2) { font-weight: bold; }
.recs-table td:nth-child(3) { font-size: 0.85rem; color: var(--text2); }
.report-footer { border-top: 1px solid var(--border); padding: 1.5rem 2rem; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text3); margin-top: 4rem; }
""".strip()

DARK_OVERRIDE_CSS = """
:root {
  --bg: #111110; --surface: #1c1c1a; --surface2: #252523;
  --border: #333330; --border2: #44443f;
  --text: #e8e6e1; --text2: #a09c95; --text3: #6a665f;
  --accent: #5b8aff; --accent-bg: #1a2240;
  --green: #2ecc71; --green-bg: #132a1c;
  --amber: #e2a83e; --amber-bg: #2a2010;
  --red: #e74c3c; --red-bg: #2a1210;
  --purple: #9b59b6; --purple-bg: #1e1230;
}
.report-header { background: #0a0a09; }
.header-stats { border-top-color: #2a2a28; }
.header-stat { border-right-color: #2a2a28; }
.toc { background: var(--surface); border-bottom-color: var(--border); }
.section-head { border-bottom-color: var(--border2); }
""".strip()

CORPORATE_OVERRIDE_CSS = """
:root {
  --bg: #f0f4f8; --surface: #ffffff; --surface2: #e8edf2;
  --border: #d0d7e0; --border2: #b8c2cc;
  --text: #1e293b; --text2: #475569; --text3: #94a3b8;
  --accent: #2563eb; --accent-bg: #eff6ff;
  --green: #16a34a; --green-bg: #f0fdf4;
  --amber: #d97706; --amber-bg: #fffbeb;
  --red: #dc2626; --red-bg: #fef2f2;
  --purple: #7c3aed; --purple-bg: #f5f3ff;
}
.report-header { background: #0f172a; }
.header-stats { border-top-color: #1e293b; }
.header-stat { border-right-color: #334155; }
""".strip()

LAYOUTS = [
    {
        "type": "HEADER", "name": "Stats Bar", "is_default": True,
        "description": "Dark header with title, subtitle, and a row of KPI stats.",
        "html_template": '<header class="report-header">\n  <div style="max-width:1100px; margin:0 auto;">\n    <h1>{{title}}</h1>\n    <p class="subtitle mono">{{subtitle}}</p>\n    <div class="header-stats">\n      {{stats}}\n    </div>\n  </div>\n</header>',
    },
    {
        "type": "NAV", "name": "Sticky Scroll", "is_default": True,
        "description": "Horizontal scrollable sticky navigation bar.",
        "html_template": '<nav class="toc">\n  {{navLinks}}\n</nav>',
    },
    {
        "type": "FOOTER", "name": "Minimal Line", "is_default": True,
        "description": "Single-line monospace footer.",
        "html_template": '<footer class="report-footer">\n  {{footerText}}\n</footer>',
    },
]


async def main():
    async with AsyncSessionLocal() as db:
        # Roles
        roles = {
            "ADMIN": {"is_built_in": True, "is_default": False},
            "SALES": {"is_built_in": False, "is_default": True},
            "SDR": {"is_built_in": False, "is_default": False},
            "DEV": {"is_built_in": False, "is_default": False},
        }
        role_objs = {}
        for name, attrs in roles.items():
            existing = (await db.execute(select(CustomRole).where(CustomRole.name == name))).scalar_one_or_none()
            if not existing:
                existing = CustomRole(name=name, **attrs)
                db.add(existing)
                await db.flush()
            role_objs[name] = existing

        # Users
        async def upsert_user(name, email, password, role):
            existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if existing:
                return existing
            u = User(name=name, email=email, password=hash_password(password), role=role)
            db.add(u)
            await db.flush()
            return u

        admin = await upsert_user("Admin User", "admin@crm.com", "admin123", "ADMIN")
        sales = await upsert_user("Sales User", "sales@crm.com", "sales123", "SALES")
        sdr = await upsert_user("SDR User", "sdr@crm.com", "sdr123", "SDR")
        await upsert_user("Dev User", "dev@crm.com", "dev123", "DEV")

        # Folders
        async def upsert_folder(name, type_, description, created_by_id, parent_id=None):
            existing = (await db.execute(select(Folder).where(Folder.name == name, Folder.created_by_id == created_by_id))).scalar_one_or_none()
            if existing:
                return existing
            f = Folder(name=name, type=type_, description=description, created_by_id=created_by_id, parent_id=parent_id)
            db.add(f)
            await db.flush()
            return f

        sales_folder = await upsert_folder("Q1 Sales Reports", "SALES", "Quarterly sales performance reports", admin.id)
        sdr_folder = await upsert_folder("SDR Pipeline Reports", "SDR", "SDR team pipeline and activity reports", admin.id)
        await upsert_folder("Dev Sprint Reports", "DEV", "Development sprint and velocity reports", admin.id)
        await upsert_folder("Monthly Breakdowns", "SALES", "Month-by-month sales breakdowns", admin.id, parent_id=sales_folder.id)

        # Shares
        async def ensure_share(folder_id, share_type, role_target=None, user_id=None):
            stmt = select(FolderShare).where(FolderShare.folder_id == folder_id, FolderShare.share_type == share_type)
            stmt = stmt.where(FolderShare.role_target == role_target) if role_target else stmt.where(FolderShare.user_id == user_id)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if not existing:
                db.add(FolderShare(folder_id=folder_id, share_type=share_type, role_target=role_target, user_id=user_id))

        await ensure_share(sales_folder.id, "ROLE", role_target="SALES")
        await ensure_share(sdr_folder.id, "ROLE", role_target="SDR")
        await ensure_share(sdr_folder.id, "USER", user_id=sales.id)

        # Themes
        async def upsert_theme(name, description, css, is_default):
            existing = (await db.execute(select(ReportTheme).where(ReportTheme.name == name))).scalar_one_or_none()
            if existing:
                existing.css_content = css
                existing.description = description
                existing.is_default = is_default
            else:
                db.add(ReportTheme(name=name, description=description, css_content=css, is_default=is_default))

        await upsert_theme("Default", "Warm editorial — off-white surfaces, Georgia serif.", DEFAULT_THEME_CSS, True)
        await upsert_theme("Dark Executive", "Dark surfaces, light text, adjusted semantic accents.", f"{DEFAULT_THEME_CSS}\n\n{DARK_OVERRIDE_CSS}", False)
        await upsert_theme("Corporate Blue", "Clean cold-toned professional palette.", f"{DEFAULT_THEME_CSS}\n\n{CORPORATE_OVERRIDE_CSS}", False)

        # Layout components
        for layout in LAYOUTS:
            existing = (await db.execute(select(LayoutComponent).where(LayoutComponent.type == layout["type"], LayoutComponent.name == layout["name"]))).scalar_one_or_none()
            if not existing:
                db.add(LayoutComponent(**layout, css_extra=""))

        await db.commit()

        print("Seed complete.")
        print("  admin@crm.com / admin123")
        print("  sales@crm.com / sales123")
        print("  sdr@crm.com   / sdr123")
        print("  dev@crm.com   / dev123")


if __name__ == "__main__":
    asyncio.run(main())
