from io import BytesIO
from uuid import UUID

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, User

router = APIRouter(prefix="/bookings/pass", tags=["booking passes"])


@router.get("/{booking_id}/qr")
async def booking_pass_qr(
    booking_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")

    # The QR is an identifier, not an authorization credential. A future
    # reception/scanner workflow must validate this booking against the API.
    payload = f"SBPPADEL|{booking.id}|{booking.booking_code}"
    image = qrcode.make(
        payload,
        image_factory=qrcode.image.svg.SvgPathImage,
        box_size=8,
        border=2,
    )
    stream = BytesIO()
    image.save(stream)
    return Response(
        content=stream.getvalue(),
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store"},
    )
