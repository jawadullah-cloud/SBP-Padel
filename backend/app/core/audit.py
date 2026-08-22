from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import User
from app.models.platform import AuditLog


async def write_audit(
    db: AsyncSession,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str | UUID | None,
    summary: str,
    *,
    venue_id: UUID | None = None,
    payload: dict | None = None,
) -> AuditLog:
    row = AuditLog(
        actor_user_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        venue_id=venue_id,
        summary=summary,
        payload=payload or {},
    )
    db.add(row)
    return row
