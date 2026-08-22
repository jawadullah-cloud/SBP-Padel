from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.domain import PolicyVersion

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("/active")
async def active_policy(db: AsyncSession = Depends(get_db)) -> dict:
    policy = await db.scalar(
        select(PolicyVersion)
        .where(
            PolicyVersion.is_active.is_(True),
            PolicyVersion.effective_from <= datetime.now(timezone.utc),
        )
        .order_by(PolicyVersion.effective_from.desc())
    )
    if not policy:
        raise HTTPException(404, "No active booking policy is published")
    return {
        "id": str(policy.id),
        "version": policy.version,
        "title": policy.title,
        "body": policy.body,
        "effective_from": policy.effective_from.isoformat(),
    }
