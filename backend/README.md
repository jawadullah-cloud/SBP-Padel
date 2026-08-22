# SBP Padel Backend

FastAPI service for the production SBP Padel platform.

## Current milestone

This first backend foundation includes:

- async FastAPI application
- PostgreSQL-ready SQLAlchemy domain model
- local SQLite development fallback
- Nishtar Park reference seed
- five courts
- variable hourly pricing rules
- venue discovery API
- venue details API
- per-court/per-hour availability API
- booking/payment/refund/policy/notification schema foundation

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

For availability, first copy the venue ID from `/api/v1/venues`, then call:

`GET /api/v1/venues/{venue_id}/availability?date=2026-08-23`

## Production database

Development defaults to SQLite only to make initial local testing simple. Production is designed for PostgreSQL. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL `postgresql+asyncpg://...` connection string.

Before production deployment, automatic `create_all()` will be replaced by Alembic migrations and `ENVIRONMENT` will be set to a non-development value.

## Next backend milestone

1. Alembic migration baseline.
2. Authentication and RBAC.
3. Active policy API and explicit policy acceptance.
4. Booking quote endpoint that calculates server-side totals from selected slots.
5. Redis-backed short-lived slot locks.
6. Booking creation and My Bookings APIs.
7. Payment-provider adapter interface.
