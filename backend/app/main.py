from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.account import router as account_router
from app.api.admin import router as admin_router
from app.api.admin_finance import router as admin_finance_router
from app.api.admin_governance import router as admin_governance_router
from app.api.admin_hq import router as admin_hq_router
from app.api.admin_reports import router as admin_reports_router
from app.api.auth import router as auth_router
from app.api.booking_participants import router as booking_participants_router
from app.api.booking_passes import router as booking_passes_router
from app.api.bookings import router as bookings_router
from app.api.cancellations import router as cancellations_router
from app.api.health import router as health_router
from app.api.notifications import router as notifications_router
from app.api.operations import router as operations_router
from app.api.operations_courts import router as operations_courts_router
from app.api.operations_management import router as operations_management_router
from app.api.operations_passes import router as operations_passes_router
from app.api.operations_players import router as operations_players_router
from app.api.operations_reschedules import router as operations_reschedules_router
from app.api.payments import router as payments_router
from app.api.player_payments import router as player_payments_router
from app.api.policies import router as policies_router
from app.api.reschedules import router as reschedules_router
from app.api.routes import router
from app.api.venue_gallery import router as venue_gallery_router
from app.core.audit_middleware import AdministrationAuditMiddleware
from app.core.config import settings, validate_runtime_settings
from app.core.slot_locks import slot_locks
from app.db.seed import seed_reference_data
from app.db.session import SessionLocal, engine
from app.models import booking_participants as booking_participant_models  # noqa:F401
from app.models import operations as operations_models  # noqa:F401
from app.models import platform as platform_models  # noqa:F401
from app.models.domain import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_runtime_settings(settings)
    if settings.environment == "development":
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with SessionLocal() as session:
            await seed_reference_data(session)
    yield
    await slot_locks.close()


non_local = settings.environment.strip().lower() not in {"development", "test"}
app = FastAPI(
    title=settings.app_name,
    version="0.11.0",
    description="Sports Board Punjab Padel booking and venue management API",
    lifespan=lifespan,
    docs_url=None if non_local else "/docs",
    redoc_url=None if non_local else "/redoc",
    openapi_url=None if non_local else "/openapi.json",
)
app.add_middleware(AdministrationAuditMiddleware)
if non_local:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def baseline_security_headers(request, call_next):
    response = await call_next(request)
    defaults = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
    }
    for name, value in defaults.items():
        if name not in response.headers:
            response.headers[name] = value
    return response


for api_router in [
    router,
    auth_router,
    account_router,
    policies_router,
    booking_passes_router,
    bookings_router,
    booking_participants_router,
    cancellations_router,
    reschedules_router,
    player_payments_router,
    payments_router,
    notifications_router,
    admin_router,
    admin_hq_router,
    admin_governance_router,
    admin_finance_router,
    admin_reports_router,
    venue_gallery_router,
    operations_router,
    operations_courts_router,
    operations_management_router,
    operations_reschedules_router,
    operations_passes_router,
    operations_players_router,
]:
    app.include_router(api_router, prefix=settings.api_prefix)

app.include_router(health_router)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    payload = {"service": settings.app_name, "api": settings.api_prefix}
    if not non_local:
        payload["docs"] = "/docs"
    return payload
