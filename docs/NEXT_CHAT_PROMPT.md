# SBP-Padel — Next Chat Handoff Prompt

Continue active development of **SBP-Padel** from the current `backend-v1-dev` branch.

## Mandatory startup

Use the connected GitHub repository immediately:

- Repository: `jawadullah-cloud/SBP-Padel`
- Working branch: `backend-v1-dev`

Before discussing or changing anything:

1. Inspect the current HEAD of `backend-v1-dev`.
2. Read this file completely.
3. Read the durable repository documentation and implementation relevant to the current task.
4. Inspect recent commits around HEAD.
5. Treat repository state and actual runtime behavior as the source of truth.

This is a continuation of an existing project, not a new project.

## Locked player web milestone

The user has manually accepted the player web runtime through the complete booking lifecycle, notifications, My Bookings/detail, reschedule/cancel/refund, account/profile/avatar, Wallet/Payment History, favourites, light/dark theme and smooth deep-route transitions including booking Review/Payment.

Do not reopen player work without a concrete reproduced regression.

## Player runtime ownership

- `docs/review-entry.js` owns Venue → Date → Court → Time → Review → Payment → Confirmation.
- `docs/notifications-live.js` owns Notifications.
- `docs/player-bookings-live.js` owns My Bookings.
- `docs/player-booking-detail-live.js` owns booking detail / reschedule / cancellation / refund state.
- `docs/player-profile-live.js` owns live profile/auth/menu/logout/avatar behavior.
- `docs/player-payment-history-live.js` owns Payment History.
- `docs/player-wallet-live.js` owns Wallet presentation/activity.
- `docs/profile-modules.js` owns only Saved Players, Favourite Venues and Help & Support sub-screens plus favourite persistence.
- `docs/theme-bridge.js` owns player theme state.
- `docs/deep-route-smooth.js` owns preload/reveal transitions for booking detail and booking Review/Payment entry.

Legacy `docs/player-account-live.js` must not be loaded by the effective runtime.

## Accepted venue-operations milestone 1

The user manually accepted the first Next.js venue/front-desk console milestone.

Accepted behavior:

- real manager/operator login and venue assignment;
- Court Schedule by date/court;
- enriched Bookings with player/contact/court/payment/check-in context;
- search by booking code, player name, email or phone;
- booking detail drawer and real Check In action;
- Closures & Maintenance, including all-court and specific-court blocks;
- manager/operator permission boundaries for closures;
- Court Active/Maintenance/Closed controls.

Do not redesign or remove these accepted workflows without a concrete regression.

## Active milestone: venue/admin operations phase 2

Implemented and awaiting manual review:

### Backend

`backend/app/api/operations_management.py` adds venue-scoped operational APIs:

- `GET /operations/players/search` searches registered player accounts for staff booking;
- `POST /operations/bookings/front-desk` creates a real confirmed booking for a registered player, checks the same live slot/pricing rules used by the player app, records a paid venue-front-desk payment, and sends a real booking-confirmed notification;
- `GET/POST/DELETE /operations/pricing-rules` exposes venue pricing to staff, with mutations restricted to venue manager/admin;
- `GET /operations/finance` returns venue-scoped payment/refund history and gross/refund/net totals;
- `PATCH /operations/refunds/{refund_id}` allows venue manager/admin to move a refund to processing/completed/rejected and updates the player notification/payment state;
- `GET /operations/reports/summary` returns venue booking, booked-hour, check-in, revenue/refund/net and estimated occupancy metrics.

`backend/app/main.py` mounts this operations-management router and API version is advanced to 0.9.0.

`backend/tests/test_operations_management.py` covers the front-desk booking → finance/report → pricing permission → player cancel/refund → manager refund-processing lifecycle.

### Admin console

`admin/app/page.tsx` now adds these operational areas to the accepted console:

- **New Booking**: registered-player search, live date/court availability, multi-slot selection, live quote, cash/card-terminal/bank-transfer recording, policy acknowledgment, confirmed booking creation;
- **Payments & Refunds**: date-range finance totals, real transactions, refund state, manager Process/Complete/Reject controls;
- **Pricing**: current active rules, court/date/day/time/rate/priority rule creation for managers, view-only for operators, and deactivation;
- **Reports**: date-range booking, court-hour, check-in, occupancy and gross/refund/net metrics.

`admin/app/operations-v2.css` contains the presentation for these phase-2 workflows and is loaded by `admin/app/layout.tsx`.

## Permissions retained

- Venue operator: view venue data, search players, create front-desk bookings, check in players, view pricing, finance and reports.
- Venue manager/admin: all operator abilities plus closures, court-status changes, pricing mutations and refund processing.
- Central admin/HQ endpoints under `/admin` remain separate and are not replaced by the venue operations APIs.

## Verification discipline

The connected chat environment can edit/read GitHub but cannot clone GitHub into its container because outbound GitHub DNS is blocked. New QA can therefore be committed before its Actions results are visible through the connector.

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's Windows runtime manually accepted.

The first venue console milestone is manually accepted. Phase 2 above is implemented and test-covered but requires manual runtime review.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

Do not claim behavior is fixed merely because code exists in Git. State clearly what was code-reviewed, automatically tested, and manually verified.

When manual review is required, provide only the minimal PowerShell pull/restart commands and the exact flow to inspect.
