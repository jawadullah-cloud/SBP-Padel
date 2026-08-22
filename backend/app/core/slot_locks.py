from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time
from uuid import UUID, uuid4

from redis.asyncio import Redis

from app.core.config import settings


ACQUIRE_SCRIPT = """
for i, key in ipairs(KEYS) do
  if redis.call('exists', key) == 1 then
    return 0
  end
end
for i, key in ipairs(KEYS) do
  redis.call('set', key, ARGV[1], 'EX', ARGV[2])
end
return 1
"""

RELEASE_SCRIPT = """
for i, key in ipairs(KEYS) do
  if redis.call('get', key) == ARGV[1] then
    redis.call('del', key)
  end
end
return 1
"""


@dataclass
class SlotLockResult:
    acquired: bool
    token: str | None
    redis_used: bool


class SlotLockService:
    def __init__(self) -> None:
        self._redis: Redis | None = Redis.from_url(settings.redis_url, decode_responses=True) if settings.redis_url else None

    @staticmethod
    def key(court_id: UUID, booking_date: date, start_time: time) -> str:
        return f"sbp-padel:slot:{court_id}:{booking_date.isoformat()}:{start_time.strftime('%H:%M')}"

    async def acquire(self, court_id: UUID, booking_date: date, starts: list[time]) -> SlotLockResult:
        if not self._redis:
            if settings.redis_required:
                raise RuntimeError("Redis is required for slot locking but REDIS_URL is not configured")
            return SlotLockResult(acquired=True, token=None, redis_used=False)
        token = uuid4().hex
        keys = [self.key(court_id, booking_date, start) for start in starts]
        ttl = max(60, settings.slot_hold_minutes * 60)
        try:
            acquired = bool(await self._redis.eval(ACQUIRE_SCRIPT, len(keys), *keys, token, ttl))
        except Exception:
            if settings.redis_required:
                raise
            return SlotLockResult(acquired=True, token=None, redis_used=False)
        return SlotLockResult(acquired=acquired, token=token if acquired else None, redis_used=True)

    async def release(self, court_id: UUID, booking_date: date, starts: list[time], token: str | None) -> None:
        if not self._redis or not token:
            return
        keys = [self.key(court_id, booking_date, start) for start in starts]
        try:
            await self._redis.eval(RELEASE_SCRIPT, len(keys), *keys, token)
        except Exception:
            if settings.redis_required:
                raise

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()


slot_locks = SlotLockService()
