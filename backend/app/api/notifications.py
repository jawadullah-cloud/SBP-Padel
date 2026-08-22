from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Notification, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me")
async def my_notifications(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
        )
    ).all()
    return [
        {
            "id": str(n.id),
            "kind": n.kind,
            "title": n.title,
            "body": n.body,
            "payload": n.payload,
            "read": n.read_at is not None,
            "created_at": n.created_at.isoformat(),
        }
        for n in rows
    ]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    notification = await db.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()
    return {"id": str(notification.id), "read": True}


@router.post("/me/read-all")
async def mark_all_read(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (
        await db.scalars(
            select(Notification).where(
                Notification.user_id == user.id,
                Notification.read_at.is_(None),
            )
        )
    ).all()
    now = datetime.now(timezone.utc)
    for row in rows:
        row.read_at = now
    await db.commit()
    return {"updated": len(rows)}
