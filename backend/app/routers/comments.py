from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.report import Comment, Report
from app.schemas.report import CommentCreate, CommentOut
from app.services.notifications import notify

router = APIRouter(prefix="/api/reports", tags=["comments"])


@router.get("/{report_id}/comments")
async def list_comments(report_id: str, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(Comment).options(selectinload(Comment.user)).where(Comment.report_id == report_id).order_by(Comment.created_at.asc())
    )
    return {"comments": [CommentOut.model_validate(c) for c in result.scalars().all()]}


@router.post("/{report_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(report_id: str, body: CommentCreate, user: CurrentUser, db: DbSession):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content required")

    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Not found")

    comment = Comment(report_id=report_id, user_id=user.user_id, content=body.content.strip())
    db.add(comment)
    await db.flush()

    if report.uploaded_by_id != user.user_id:
        await notify(
            db, report.uploaded_by_id, "COMMENT_ADDED", f'New comment on "{report.title}"',
            f"{user.name}: {body.content.strip()[:80]}", f"/folders/{report.folder_id}/reports/{report.id}",
        )

    await db.commit()
    result = await db.execute(select(Comment).options(selectinload(Comment.user)).where(Comment.id == comment.id))
    return {"comment": CommentOut.model_validate(result.scalar_one())}


@router.delete("/{report_id}/comments/{comment_id}")
async def delete_comment(report_id: str, comment_id: str, user: CurrentUser, db: DbSession):
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Not found")
    if comment.user_id != user.user_id and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.delete(comment)
    await db.commit()
    return {"ok": True}
