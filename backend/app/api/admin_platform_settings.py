from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.config import settings
from app.core.security import require_roles
from app.db.session import get_db
from app.models.domain import User, UserRole
from app.models.platform import PlatformSetting

router = APIRouter(prefix="/admin/platform-settings", tags=["platform settings"])
admin_user = require_roles(UserRole.admin)
SERVICE_FEE_KEY = "checkout_service_fee"


class ServiceFeeRequest(BaseModel):
    service_fee: int = Field(ge=0, le=100000)


@router.get("/service-fee")
async def read_service_fee(
    _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
) -> dict:
    row = await db.get(PlatformSetting, SERVICE_FEE_KEY)
    value = int(row.value) if row else int(settings.service_fee)
    return {"service_fee": value, "currency": "PKR"}


@router.patch("/service-fee")
async def update_service_fee(
    payload: ServiceFeeRequest,
    actor: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await db.get(PlatformSetting, SERVICE_FEE_KEY)
    previous = int(row.value) if row else int(settings.service_fee)
    if row:
        row.value = str(payload.service_fee)
        row.updated_by_user_id = actor.id
    else:
        row = PlatformSetting(
            key=SERVICE_FEE_KEY,
            value=str(payload.service_fee),
            updated_by_user_id=actor.id,
        )
        db.add(row)
    settings.service_fee = payload.service_fee
    await write_audit(
        db,
        actor,
        "platform.service_fee.updated",
        "platform_setting",
        SERVICE_FEE_KEY,
        f"Checkout service fee changed from PKR {previous} to PKR {payload.service_fee}",
        payload={"previous": previous, "service_fee": payload.service_fee, "currency": "PKR"},
    )
    await db.commit()
    return {"service_fee": payload.service_fee, "currency": "PKR"}
