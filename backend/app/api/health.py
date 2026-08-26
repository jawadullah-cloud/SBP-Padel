from fastapi import APIRouter, HTTPException
from redis.asyncio import Redis
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal

router = APIRouter(tags=["health"])


@router.get("/health/live", include_in_schema=False)
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready", include_in_schema=False)
async def ready() -> dict[str, str]:
    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        if settings.redis_required:
            if not settings.redis_url:
                raise RuntimeError("Redis is required but not configured")
            redis = Redis.from_url(settings.redis_url, decode_responses=True)
            try:
                await redis.ping()
            finally:
                await redis.aclose()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Service dependencies are not ready") from exc
    return {"status": "ready"}
