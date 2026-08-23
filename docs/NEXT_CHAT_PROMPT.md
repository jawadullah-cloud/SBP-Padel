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

### Player runtime ownership

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

## Venue operations: manually accepted behavior

The user has manually accepted the current Next.js venue/front-desk console through the following areas:

- manager/operator login and venue assignment;
- Court Schedule by date/court;
- enriched Bookings with player/contact/court/payment/check-in context;
- booking search by code, player name, email or phone;
- booking detail drawer and real Check In action;
- Closures & Maintenance with all-court and specific-court blocks;
- Court Active/Maintenance/Closed controls;
- front-desk New Booking using live availability/pricing and real paid booking creation;
- Payments & Refunds;
- Bookable Hours & Pricing;
- Reports;
- venue-side player registration and duplicate protection.

Do not redesign or remove these accepted workflows without a concrete regression.

## Important operational decisions

### Bookable Hours & Pricing

Pricing rules are also the booking schedule.

- A one-hour slot exists for booking only when an active pricing rule covers that court/date/weekday/hour.
- Example: a rule 18:00–20:00 exposes 18:00–19:00 and 19:00–20:00.
- Hours without an active pricing rule are hidden completely from availability.
- A normally bookable priced slot that is already occupied remains visible as `Booked` / unavailable.
- Elapsed, administratively blocked or unpriced hours are not shown in the booking picker.

The availability behavior is enforced centrally by `backend/app/api/routes.py`, not only in the admin UI.

### Booking sorting

- General **Bookings** is an activity/history view and is ordered by `Booking.created_at DESC`, newest-created booking first.
- **Court Schedule** remains chronological by actual session time within each court/date.

### Front-desk booking completion

After a successful staff-created booking, the console clears booking filters, reloads the full venue booking list, switches to **Bookings**, and opens the newly-created booking in the detail drawer.

## Venue operations backend

`backend/app/api/operations.py` owns venue bookings/check-in/blocks and general venue access.

`backend/app/api/operations_management.py` owns:

- `GET /operations/players/search`;
- `POST /operations/bookings/front-desk`;
- `GET/POST/DELETE /operations/pricing-rules`;
- `GET /operations/finance`;
- `PATCH /operations/refunds/{refund_id}`;
- `GET /operations/reports/summary`.

Venue-side player registration is implemented by the operations player endpoint and uses normal `UserRole.player` accounts with duplicate email/phone protection and a one-time temporary password for walk-in registration.

`backend/tests/test_operations_management.py` covers the front-desk booking → finance/report → pricing permission → player cancel/refund → manager refund-processing lifecycle.

A separate player-registration regression test covers operator registration/search and duplicate protection.

## Venue admin console

`admin/app/page.tsx` owns the main venue console.

Current operational areas:

- Court Schedule
- Bookings
- New Booking
- Payments & Refunds
- Bookable Hours & Pricing
- Closures & Maintenance
- Courts
- Reports

`admin/app/players/page.tsx` owns venue-side Player Management. The user has manually accepted the player registration function. The page has now been moved into the same venue-operations visual/session shell and is pending visual/manual review of that integration.

`admin/app/operations-v2.css` contains phase-2 operational presentation.
`admin/app/players-ui.css` contains Player Management shell/presentation.
`admin/app/layout.tsx` loads both.

## Permissions retained

- Venue operator: view venue data, search/register players, create front-desk bookings, check in players, view pricing, finance and reports.
- Venue manager/admin: all operator abilities plus closures, court-status changes, pricing mutations and refund processing.
- Central admin/HQ endpoints under `/admin` remain separate and are not replaced by venue operations APIs.

## Current active work

Finish venue-console completion/regression without reopening accepted player-web behavior.

Immediate priorities:

1. complete Player Management navigation integration into the main operations experience;
2. run/inspect Admin Portal CI build for the latest admin changes;
3. run backend operations regression after the latest availability/sorting/player-registration changes;
4. inspect remaining venue-console UX gaps and only then move toward central/HQ administration or production deployment work.

## Verification discipline

The connected chat environment can edit/read GitHub but cannot clone GitHub into its container because outbound GitHub DNS is blocked. New QA can therefore be committed before its Actions results are visible through the connector.

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's Windows runtime manually accepted.

Do not claim behavior is fixed merely because code exists in Git.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

When manual review is required, provide only the minimal PowerShell pull/restart commands and the exact flow to inspect.
