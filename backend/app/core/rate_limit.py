from __future__ import annotations

import asyncio
import hashlib
import hmac
import time

from fastapi import HTTPException, Request
from redis.asyncio import Redis

from app.core.config import settings

_local_lock = asyncio.Lock()
_local_buckets: dict[str, tuple[float, int]] = {}
_redis: Redis | None = None


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:128]
    if request.client and request.client.host:
        return request.client.host[:128]
    return "unknown"


def _bucket_key(action: str, subject: str) -> str:
    digest = hmac.new(
        settings.jwt_secret.encode(),
        subject.strip().lower().encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"sbp-padel:rate:{action}:{digest}"


async def _redis_client() -> Redis | None:
    global _redis
    if not settings.redis_url:
        return None
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def enforce_rate_limit(action: str, subject: str, limit: int) -> None:
    """Bound abusive public auth traffic.

    Redis is used when configured so limits work across multiple app instances.
    Local fallback keeps development/UAT safe from accidental hammering but is
    intentionally not a substitute for Redis in a horizontally scaled deployment.
    """
    if settings.environment.strip().lower() == "test":
        return
    window = settings.auth_rate_limit_window_seconds
    key = _bucket_key(action, subject)
    redis = await _redis_client()
    if redis is not None:
        try:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window)
            if count > limit:
                raise HTTPException(429, "Too many attempts. Please try again later.")
            return
        except HTTPException:
            raise
        except Exception:
            if settings.redis_required:
                raise HTTPException(503, "Security rate limiter is temporarily unavailable")

    now = time.monotonic()
    async with _local_lock:
        started, count = _local_buckets.get(key, (now, 0))
        if now - started >= window:
            started, count = now, 0
        count += 1
        _local_buckets[key] = (started, count)
        if len(_local_buckets) > 5000:
            expired = [k for k, (s, _) in _local_buckets.items() if now - s >= window]
            for old_key in expired[:2500]:
                _local_buckets.pop(old_key, None)
        if count > limit:
            raise HTTPException(429, "Too many attempts. Please try again later.")
