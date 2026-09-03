from __future__ import annotations

from uuid import UUID

import jwt
from jwt.exceptions import PyJWTError
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.audit import write_audit
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.domain import User


class AdministrationAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return response

        admin_or_operations = path.startswith(f"{settings.api_prefix}/admin") or path.startswith(
            f"{settings.api_prefix}/operations"
        )
        payment_operation = path.startswith(f"{settings.api_prefix}/payments")
        if not (admin_or_operations or payment_operation):
            return response

        actor = None
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            try:
                payload = jwt.decode(
                    auth.split(" ", 1)[1],
                    settings.jwt_secret,
                    algorithms=[settings.jwt_algorithm],
                )
                user_id = UUID(payload.get("sub", ""))
                async with SessionLocal() as session:
                    actor = await session.get(User, user_id)
            except (PyJWTError, ValueError, TypeError):
                actor = None
            except Exception:
                actor = None

        try:
            async with SessionLocal() as session:
                action_prefix = "payment" if payment_operation else "administration"
                await write_audit(
                    session,
                    actor,
                    f"{action_prefix}.{request.method.lower()}.{path.removeprefix(settings.api_prefix).strip('/').replace('/', '.')}",
                    "payment_api_operation" if payment_operation else "api_operation",
                    None,
                    f"{request.method} {path} returned {response.status_code}",
                    payload={
                        "path": path,
                        "method": request.method,
                        "status_code": response.status_code,
                    },
                )
                await session.commit()
        except Exception:
            # Audit capture must never make a successful operational or payment action fail.
            pass
        return response
