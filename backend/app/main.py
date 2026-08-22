from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.admin_hq import router as admin_hq_router
from app.api.auth import router as auth_router
from app.api.bookings import router as bookings_router
from app.api.cancellations import router as cancellations_router
from app.api.notifications import router as notifications_router
from app.api.operations import router as operations_router
from app.api.operations_courts import router as operations_courts_router
from app.api.payments import router as payments_router
from app.api.policies import router as policies_router
from app.api.routes import router
from app.core.config import settings
from app.db.seed import seed_reference_data
from app.db.session import SessionLocal, engine
from app.models import operations as operations_models  # noqa: F401
from app.models.domain import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment == "development":
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with SessionLocal() as session:
            await seed_reference_data(session)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.6.0",
    description="Sports Board Punjab Padel booking and venue management API",
    lifespan=lifespan,
)
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
app.include_router(bookings_router, prefix=settings.api_prefix)
app.include_router(cancellations_router, prefix=settings.api_prefix)
app.include_router(payments_router, prefix=settings.api_prefix)
app.include_router(notifications_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(admin_hq_router, prefix=settings.api_prefix)
app.include_router(operations_router, prefix=settings.api_prefix)
app.include_router(operations_courts_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": settings.app_name, "api": settings.api_prefix, "docs": "/docs"}
