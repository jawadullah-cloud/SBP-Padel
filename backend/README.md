# SBP Padel Backend

FastAPI service for the production SBP Padel platform.

## Current milestone

The backend currently includes:

- async FastAPI application
- PostgreSQL-ready SQLAlchemy domain model
- local SQLite development fallback
- Nishtar Park reference seed with five courts
- variable hourly pricing rules
- venue discovery/details APIs
- per-court/per-hour availability API
- player registration, login and JWT authentication
- active versioned booking/refund policy API
- server-side booking quote calculation
- 10-minute checkout slot holds
- booking creation, details and My Bookings APIs
- booking cancellation and slot release
- provider-neutral payment-attempt records
- development-only payment success/failure simulator
- confirmed-booking transition after successful payment
- refund-request records
- in-app notification records and read/read-all APIs

The approved player UI remains in `../docs/` and is not modified by backend work on `backend-v1-dev`.

## Local start

From the `backend` folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .
uvicorn app.main:app --reload
```

Then open:

- API documentation: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/v1/health`
- Venues: `http://127.0.0.1:8000/api/v1/venues`

For availability, copy the venue ID from `/api/v1/venues`, then call:

`GET /api/v1/venues/{venue_id}/availability?date=2026-08-23`

## Development booking/payment flow

1. `POST /api/v1/auth/login`
2. `GET /api/v1/policies/active`
3. `POST /api/v1/bookings/quote`
4. `POST /api/v1/bookings`
5. `POST /api/v1/payments/initiate`
6. In development only: `POST /api/v1/payments/{payment_id}/simulate-success`
7. `GET /api/v1/bookings/me`
8. `GET /api/v1/notifications/me`

The simulator is intentionally hidden from the production OpenAPI schema and is disabled outside `ENVIRONMENT=development`. A real payment gateway will replace only the provider adapter/callback step, not the booking domain.

## Production database

Development defaults to SQLite to keep initial local testing simple. Production is designed for PostgreSQL. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL `postgresql+asyncpg://...` connection string.

Before production deployment, automatic `create_all()` will be replaced by Alembic migrations and `ENVIRONMENT` will be set to a non-development value.

## Next backend milestone

1. Alembic migration baseline.
2. Redis-backed atomic slot locks and expiry worker.
3. Administrator/venue-operator RBAC dependencies.
4. Venue, court and pricing management APIs.
5. Closure/maintenance blocks.
6. Booking search and operational actions.
7. Payment-provider adapter implementation after SBP selects the gateway.
8. Reconciliation/refund administration APIs.
