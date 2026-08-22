from __future__ import annotations

from fastapi import Request
from jose import JWTError, jwt
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
        if not (path.startswith(f"{settings.api_prefix}/admin") or path.startswith(f"{settings.api_prefix}/operations")):
            return response

        actor = None
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            try:
                payload = jwt.decode(auth.split(" ", 1)[1], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
                user_id = payload.get("sub")
                if user_id:
                    async with SessionLocal() as session:
                        actor = await session.get(User, user_id)
                        await write_audit(
                            session,
                            actor,
                            f"{request.method.lower()}.{path.removeprefix(settings.api_prefix).strip('/').replace('/', '.')}",
                            "api_operation",
                            None,
                            f"{request.method} {path} returned {response.status_code}",
                            payload={"path": path, "method": request.method, "status_code": response.status_code},
                        )
                        await session.commit()
            except (JWTError, ValueError, TypeError):
                pass
            except Exception:
                # Audit capture must never make a successful operational action fail.
                pass
        return response
