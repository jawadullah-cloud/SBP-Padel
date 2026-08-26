# SBP-Padel regression locks — 26 August 2026

These behaviors were manually observed to regress after unrelated hardening work and are now explicit release invariants. Future work must preserve them and run the targeted QA before claiming a player or operations pass is complete.

## Player Android booking flow

- `#select` (Date/Court) and `#time` (slot selection) are real vertical Android scroll surfaces.
- `docs/mobile-runtime.js` must include both screens in the CSS touch-scroll rules and in the Android manual `ownedScroller` fallback.
- Do not validate this only with `element.scrollTop` or desktop wheel scrolling. `qa/player_locked_regressions_browser.mjs` dispatches an Android-style touch gesture and requires both screens to move.

## Profile → My Bookings

- Entering My Bookings from Profile must hydrate immediately. It must never remain on the static `Loading your bookings…` placeholder until another tab is visited.
- `docs/bookings-activation-guard.js` refreshes whenever `#bookings` becomes active and waits briefly for the canonical `window.SBPRefreshBookings` owner when required.
- The guard is loaded by both the cache-free development server and the production service-worker runtime.
- `qa/player_locked_regressions_browser.mjs` enters Bookings specifically through Profile and requires the live list/empty state to replace the loading placeholder.

## Venue operations navigation

Players and Scan Pass remain dedicated routes, but they are part of the same authenticated venue-operations application.

- Court Schedule
- Bookings
- New Booking
- Payments & Refunds
- Bookable Hours & Pricing
- Closures & Maintenance
- Courts
- Reports
- Players
- Scan Pass

The full navigation and the authenticated role/sign-out footer must remain visible on Players and Scan Pass. Do not maintain a reduced independent utility sidebar. `admin/app/PlayersSidebarLink.tsx` owns the canonical utility-route navigation bridge and `admin/tests/operations-cancel.spec.ts` locks this behavior.

## Venue-side booking cancellation

- Venue manager/admin may cancel active `pending_payment`, `confirmed` or `rescheduled` bookings from booking detail.
- Venue operator may not cancel bookings.
- Venue cancellation is an operational override and produces status `venue_cancelled`.
- Slots are released immediately.
- If a paid booking has a refundable payment and no active/completed refund already exists, a refund request is created for venue/HQ processing.
- The player is notified of the venue cancellation and, where applicable, the refund request.
- Completed, cancelled, expired or otherwise inactive bookings cannot be cancelled again.

Backend ownership: `backend/app/api/operations_cancellations.py`.
Targeted backend QA: `backend/tests/test_operations_cancellations.py`.
Admin browser QA: `admin/tests/operations-cancel.spec.ts`.

## Refund access

Payments & Refunds is not HQ-only. The venue operations console already owns venue-scoped finance/refund visibility:

- manager/admin can process eligible refund workflow actions;
- operator access remains view-only where manager-only mutation applies;
- Players and Scan Pass must preserve the full sidebar so Payments & Refunds remains reachable from those routes.

## Regression discipline

A broad green suite is not sufficient when a previously accepted behavior has a history of runtime drift. When touching player runtime loaders, service workers, mobile scrolling, navigation ownership, operations shell routing or booking actions, preserve these focused assertions in addition to the normal Backend, Admin and Player CI suites.
