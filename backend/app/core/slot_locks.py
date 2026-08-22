from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, time
from uuid import UUID, uuid4

from redis.asyncio import Redis

from app.core.config import settings

ACQUIRE_SCRIPT = """
for i, key in ipairs(KEYS) do
  if redis.call('exists', key) == 1 then return 0 end
end
for i, key in ipairs(KEYS) do
  redis.call('set', key, ARGV[1], 'EX', ARGV[2])
end
return 1
"""

RELEASE_SCRIPT = """
for i, key in ipairs(KEYS) do
  if redis.call('get', key) == ARGV[1] then redis.call('del', key) end
end
return 1
"""


@dataclass
class SlotLockResult:
    acquired: bool
    token: str | None
    redis_used: bool
    keys: list[str]


class SlotLockService:
    def __init__(self) -> None:
        self._redis: Redis | None = None

    def _client(self) -> Redis | None:
        if self._redis is None and settings.redis_url:
            self._redis = Redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    @staticmethod
    def key(court_id: UUID, booking_date: date, start_time: time) -> str:
        return f"sbp-padel:slot:{court_id}:{booking_date.isoformat()}:{start_time.strftime('%H:%M')}"

    @staticmethod
    def booking_key(booking_id: UUID) -> str:
        return f"sbp-padel:booking-lock:{booking_id}"

    async def acquire(self, court_id: UUID, booking_date: date, starts: list[time]) -> SlotLockResult:
        keys = [self.key(court_id, booking_date, start) for start in starts]
        client = self._client()
        if not client:
            if settings.redis_required:
                raise RuntimeError("Redis is required for slot locking but REDIS_URL is not configured")
            return SlotLockResult(True, None, False, keys)
        token = uuid4().hex
        ttl = max(60, settings.slot_hold_minutes * 60)
        try:
            acquired = bool(await client.eval(ACQUIRE_SCRIPT, len(keys), *keys, token, ttl))
        except Exception:
            if settings.redis_required:
                raise
            return SlotLockResult(True, None, False, keys)
        return SlotLockResult(acquired, token if acquired else None, True, keys)

    async def bind_booking(self, booking_id: UUID, result: SlotLockResult) -> None:
        client = self._client()
        if not client or not result.token:
            return
        ttl = max(60, settings.slot_hold_minutes * 60)
        await client.set(self.booking_key(booking_id), json.dumps({"token": result.token, "keys": result.keys}), ex=ttl)

    async def release_result(self, result: SlotLockResult) -> None:
        client = self._client()
        if not client or not result.token:
            return
        try:
            await client.eval(RELEASE_SCRIPT, len(result.keys), *result.keys, result.token)
        except Exception:
            if settings.redis_required:
                raise

    async def release_booking(self, booking_id: UUID) -> None:
        client = self._client()
        if not client:
            return
        meta_key = self.booking_key(booking_id)
        try:
            raw = await client.get(meta_key)
            if not raw:
                return
            data = json.loads(raw)
            keys, token = data.get("keys", []), data.get("token")
            if keys and token:
                await client.eval(RELEASE_SCRIPT, len(keys), *keys, token)
            await client.delete(meta_key)
        except Exception:
            if settings.redis_required:
                raise

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None


slot_locks = SlotLockService()
