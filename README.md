# SBP-Padel

Sports Board Punjab Padel Courts digital platform.

SBP-Padel is an integrated booking and venue-operations platform with a player web/mobile experience, Android WebView wrapper, FastAPI backend, venue operations console and HQ administration portal.

## Active development branch

Current active development is on `backend-v1-dev`. Treat repository code, runtime behavior, completed CI and explicit manual acceptance as the source of truth.

Durable project context lives in:

- `docs/PROJECT_MEMORY.md`
- `docs/NEXT_CHAT_PROMPT.md`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_DEPLOYMENT.md`

## Repository structure

- `docs/` — player web/mobile runtime and supporting production-facing browser assets
- `android/` — Android wrapper and native bridges for the player experience
- `backend/` — FastAPI application, SQLAlchemy/Alembic persistence, booking/payment/operations APIs and backend tests
- `admin/` — Next.js venue operations and HQ administration portal with Playwright QA
- `qa/` — player browser-runtime regression suites
- `architecture/` — architecture documentation and diagrams
- `.github/workflows/` — Backend, Admin, Player, Android and GitHub Pages automation

## Current stack

- Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis
- Admin/HQ: Next.js, React, TypeScript, Playwright
- Player runtime: HTML/CSS/JavaScript served from `docs/`
- Android: native Android WebView wrapper with location/camera integrations

## Development entry points

Windows helper scripts are provided at repository root:

- `run_player_dev.ps1`
- `run_player_lan.ps1`
- `run_backend_lan.ps1`
- `run_admin_dev.ps1`

The player development server is `dev_player_server.py`.

## Production-readiness status

Production hardening is active, but deployment is intentionally blocked on external choices that cannot be selected implicitly: payment provider, production PostgreSQL/hosting and backup architecture, domains/HTTPS/CORS, SMTP credentials, and SBP-controlled Android release signing/distribution.

Do not treat the development payment simulator or repository debug Android signing identity as production integrations. See `docs/LAUNCH_READINESS.md` and `android/RELEASE_SIGNING.md`.
