from io import BytesIO
from struct import pack
from uuid import UUID
from zlib import compress, crc32

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, User

router = APIRouter(prefix="/bookings/pass", tags=["booking passes"])


def _png_chunk(kind: bytes, data: bytes) -> bytes:
    return pack(">I", len(data)) + kind + data + pack(">I", crc32(kind + data) & 0xFFFFFFFF)


def _qr_png(payload: str, *, scale: int = 8, border: int = 3) -> bytes:
    qr = qrcode.QRCode(box_size=1, border=0)
    qr.add_data(payload)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    modules = len(matrix)
    size = (modules + border * 2) * scale
    rows = []
    for y in range(size):
        module_y = y // scale - border
        row = bytearray([0])
        for x in range(size):
            module_x = x // scale - border
            dark = (
                0 <= module_x < modules
                and 0 <= module_y < modules
                and matrix[module_y][module_x]
            )
            row.append(0 if dark else 255)
        rows.append(bytes(row))
    raw = b"".join(rows)
    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = pack(">IIBBBBB", size, size, 8, 0, 0, 0, 0)
    return signature + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", compress(raw, 9)) + _png_chunk(b"IEND", b"")


@router.get("/{booking_id}/qr")
async def booking_pass_qr(
    booking_id: UUID,
    format: str = Query("svg", pattern="^(svg|png)$"),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")

    # The QR is an identifier, not an authorization credential. Reception must
    # always validate the decoded booking against the API before check-in.
    payload = f"SBPPADEL|{booking.id}|{booking.booking_code}"
    if format == "png":
        return Response(
            content=_qr_png(payload),
            media_type="image/png",
            headers={"Cache-Control": "no-store"},
        )

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
