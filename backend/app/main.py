from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.admin_finance import router as admin_finance_router
from app.api.admin_hq import router as admin_hq_router
from app.api.admin_reports import router as admin_reports_router
from app.api.auth import router as auth_router
from app.api.booking_participants import router as booking_participants_router
from app.api.booking_passes import router as booking_passes_router
from app.api.bookings import router as bookings_router
from app.api.cancellations import router as cancellations_router
from app.api.notifications import router as notifications_router
from app.api.operations import router as operations_router
from app.api.operations_courts import router as operations_courts_router
from app.api.operations_management import router as operations_management_router
from app.api.operations_passes import router as operations_passes_router
from app.api.operations_players import router as operations_players_router
from app.api.payments import router as payments_router
from app.api.player_payments import router as player_payments_router
from app.api.policies import router as policies_router
from app.api.reschedules import router as reschedules_router
from app.api.routes import router
from app.core.audit_middleware import AdministrationAuditMiddleware
from app.core.config import settings
from app.core.slot_locks import slot_locks
from app.db.seed import seed_reference_data
from app.db.session import SessionLocal, engine
from app.models import booking_participants as booking_participant_models  # noqa: F401
from app.models import operations as operations_models  # noqa: F401
from app.models import platform as platform_models  # noqa: F401
from app.models.domain import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment == "development":
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with SessionLocal() as session:
            await seed_reference_data(session)
    yield
    await slot_locks.close()


app = FastAPI(
    title=settings.app_name,
    version="0.10.0",
    description="Sports Board Punjab Padel booking and venue management API",
    lifespan=lifespan,
)
app.add_middleware(AdministrationAuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(policies_router, prefix=settings.api_prefix)
app.include_router(booking_passes_router, prefix=settings.api_prefix)
app.include_router(bookings_router, prefix=settings.api_prefix)
app.include_router(booking_participants_router, prefix=settings.api_prefix)
app.include_router(cancellations_router, prefix=settings.api_prefix)
app.include_router(reschedules_router, prefix=settings.api_prefix)
# Player-specific static /payments routes must be registered before the generic
# /payments/{payment_id} route so "me" is never parsed as a UUID.
app.include_router(player_payments_router, prefix=settings.api_prefix)
app.include_router(payments_router, prefix=settings.api_prefix)
app.include_router(notifications_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(admin_hq_router, prefix=settings.api_prefix)
app.include_router(admin_finance_router, prefix=settings.api_prefix)
app.include_router(admin_reports_router, prefix=settings.api_prefix)
app.include_router(operations_router, prefix=settings.api_prefix)
app.include_router(operations_courts_router, prefix=settings.api_prefix)
app.include_router(operations_management_router, prefix=settings.api_prefix)
app.include_router(operations_passes_router, prefix=settings.api_prefix)
app.include_router(operations_players_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": settings.app_name, "api": settings.api_prefix, "docs": "/docs"}
