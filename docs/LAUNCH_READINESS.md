# SBP-Padel — Launch Readiness

Updated: 26 August 2026
Branch: `backend-v1-dev`

This file separates product behavior that is implemented/tested from production decisions that still require configuration, procurement or manual acceptance. It is not a declaration that the product is production-launched.

## Product surfaces already substantially implemented

### Player
- Email/mobile + password account creation and login.
- Password recovery.
- Venue discovery, favourites, real facility gallery/cover images and directions.
- Android native location, Near Me within 15 km and nearby-aware Next Available.
- Date → Court → Time → Review → Payment → Confirmation booking flow.
- Consecutive multi-slot sessions, player count and booking participants.
- My Bookings, booking detail, reschedule, cancellation/refund request and notifications.
- Booking-level digital pass / QR.
- Google sign-in remains intentionally deferred and is not shown in the current player UI.

### Venue Manager / Operator
- Assigned-venue access and per-venue role enforcement.
- Court schedule and general booking views.
- Booking/player search and detail.
- Manual and QR/pass check-in.
- Registered-player lookup and registration.
- Front-desk booking with live availability/pricing and recorded counter payment.
- Manager-managed closures, court status and bookable hours/pricing.
- Venue finance/refund workflow and venue reporting.
- Self-service password change.
- Multi-venue switching now treats the selected venue as authoritative; late responses from a previous venue are discarded and transient front-desk selections are cleared when the venue changes.
- Confirmed and rescheduled paid bookings are both valid active bookings for pass validation/check-in.

### HQ
- Province-wide overview and booking review.
- Persistent HQ navigation.
- Venue directory, venue creation/editing, courts, pricing, assignments and facility galleries.
- Staff creation, generated/reset passwords, disable/reactivate/safe-delete and role permissions.
- Policies, refund decisions, finance, reports and management-facing activity trail.
- Exact venue UUID is preserved through Directory → Profile → Management → Gallery navigation.

## Automated quality gates

The repository currently has dedicated CI for:
- Backend API/tests.
- Admin/operations Next.js production build and Playwright browser QA.
- Player browser/runtime interaction QA.
- Android APK build.

Important regressions now explicitly covered include:
- manager/operator password changes and separate HQ reset flow;
- two-venue HQ routing context;
- operations pass/check-in for rescheduled bookings;
- operations multi-venue stale-response protection and venue-scoped transient state;
- operator read-only controls versus manager mutation controls;
- player login must not display the deferred Google sign-in option;
- non-development runtime cannot start with the repository default JWT secret.

## Production blockers / decisions still required

### 1. Real player payment provider — blocking
The online player payment path currently creates a payment with provider `unconfigured`. Development has simulator endpoints, deliberately unavailable outside development. Before public launch, select and integrate the actual payment gateway/provider, including signed callbacks/webhooks, idempotency, provider reconciliation, failure/timeout handling and real refund execution.

Front-desk payments are operational records entered by authorized venue staff and are separate from the online payment-provider integration.

### 2. Production database, migrations and backups — blocking
Development defaults to SQLite and automatically creates/seeds tables only in `development`. Production needs an explicitly selected database service, a controlled schema migration process, backup/restore policy, retention and recovery testing. Do not rely on development `create_all` behavior for production deployment.

### 3. Secrets and environment configuration — blocking
Production must provide an explicit strong `JWT_SECRET`; the backend now refuses to start outside development/test with the repository default. Production also needs explicit database, Redis (if enabled/required), CORS, SMTP and other environment values stored outside source control.

### 4. Domain, HTTPS and CORS — blocking
Choose final API/admin/player origins and configure TLS/HTTPS and the backend CORS allow-list accordingly. Localhost/LAN defaults are development configuration only.

### 5. Real email delivery — needed for public password recovery
SMTP must be configured for production password-reset emails. Development can expose delivery through its local development path; that is not a production substitute.

### 6. Venue image storage — recommended before scale
Facility images currently use database-backed data URLs. The behavior is working and accepted, but production object/blob storage is recommended before large-scale venue/photo growth. The gallery API semantics can remain unchanged while the storage layer changes.

### 7. Android release signing/distribution — blocking for store/release APK
The development Android wrapper is suitable for current testing. Public distribution requires final release signing, release configuration, versioning and the chosen distribution channel. Production OAuth identities, if Google sign-in is later enabled, must use the final release signing certificate.

### 8. Google sign-in — intentionally deferred, not a launch blocker unless product scope changes
Backend verification scaffolding exists, but the player-facing feature is deliberately hidden. It should remain hidden until Google Cloud OAuth configuration, browser/native flows, error states, staff-account isolation and manual acceptance are complete.

## Recommended remaining sequence

1. Manually review the latest Venue Manager / Operator pass on the running UI.
2. Select the real online payment provider and define settlement/refund/reconciliation requirements.
3. Choose the production database/hosting architecture and implement migrations/backups.
4. Configure production secrets, SMTP, domains, HTTPS and CORS.
5. Move facility image storage to production object storage if launch scale warrants it.
6. Complete Android release-signing/distribution setup.
7. Run a production-like staging acceptance pass across player → payment → venue check-in → refund → HQ reconciliation.

Do not mark a surface manually accepted merely because its automated CI is green. Repository state, actual runtime behavior, CI and explicit manual review remain separate sources of truth.
