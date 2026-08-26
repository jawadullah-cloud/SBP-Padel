from decimal import Decimal, InvalidOperation

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.platform import PlatformSetting

SERVICE_FEE_KEY = "checkout_service_fee"


async def get_service_fee(db: AsyncSession) -> Decimal:
    row = await db.get(PlatformSetting, SERVICE_FEE_KEY)
    if not row:
        return Decimal(str(settings.service_fee)).quantize(Decimal("0.01"))
    try:
        value = Decimal(row.value)
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(str(settings.service_fee)).quantize(Decimal("0.01"))
    if value < 0:
        return Decimal(str(settings.service_fee)).quantize(Decimal("0.01"))
    return value.quantize(Decimal("0.01"))
