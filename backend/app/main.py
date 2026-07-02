from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    admin,
    auth,
    comments,
    dashboard,
    folders,
    layouts,
    notifications,
    pinned,
    profile,
    public_links,
    reports,
    roles,
    search,
    shared,
    themes,
    users,
    versions,
)

app = FastAPI(title="Admiral Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(folders.router)
app.include_router(reports.router)
app.include_router(comments.router)
app.include_router(versions.router)
app.include_router(public_links.router)
app.include_router(shared.router)
app.include_router(notifications.router)
app.include_router(pinned.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(admin.router)
app.include_router(themes.router)
app.include_router(layouts.router)
app.include_router(profile.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
