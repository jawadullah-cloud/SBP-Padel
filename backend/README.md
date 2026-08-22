# SBP Padel Backend

FastAPI service for the production SBP Padel platform.

## Current milestone

The backend currently includes:

- async FastAPI application
- PostgreSQL-ready SQLAlchemy domain model
- local SQLite development fallback
- Alembic migration baseline
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
- central administrator RBAC
- venue manager/operator assignments scoped by venue
- front-desk booking search and check-in
- venue/court closure and maintenance controls
- court Active / Maintenance / Closed controls
- central venue and court creation APIs
- staff account and venue-assignment administration
- central pricing-rule management
- policy publishing and version history
- province-wide booking and refund oversight
- central dashboard metrics

The approved player UI remains in `../docs/` and is not modified by backend work on `backend-v1-dev`.

The Next.js staff portal is in `../admin/`:

- `/` — venue operations / front desk
- `/hq` — central SBP Padel headquarters administration

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

## Database migrations

Development can still use automatic table creation for convenience. Production deployment must use Alembic.

From `backend/`:

```powershell
alembic upgrade head
```

The first migration creates the complete current domain, including booking, payment, policy, notification and venue-operations tables. Future schema changes should be added as new migrations rather than modifying the initial revision after deployment.

## Production database

Development defaults to SQLite to keep local testing simple. Production is designed for PostgreSQL. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL `postgresql+asyncpg://...` connection string.

For production, set `ENVIRONMENT` to a non-development value, use a strong `JWT_SECRET`, and run Alembic before starting the API.

## Next backend milestone

1. Redis-backed atomic slot locks and expiry worker.
2. Real payment-provider adapter once SBP selects the gateway.
3. Payment callback/webhook verification and idempotency.
4. Venue/court editing and image/media management.
5. More detailed finance/reconciliation reports and exports.
6. Audit logging for administrative changes.
7. Notification delivery adapters for push/SMS/email.
