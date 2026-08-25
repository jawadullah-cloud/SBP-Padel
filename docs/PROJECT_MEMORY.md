# SBP-Padel — Durable Project Memory

Updated: 25 August 2026
Working branch: `backend-v1-dev`

## Source of truth

The repository, current branch HEAD, actual runtime behavior and completed CI are the source of truth. Do not assume a change works merely because it exists in Git. User manual acceptance is recorded separately from implementation and CI.

## Product surfaces

SBP-Padel currently has three distinct product surfaces:

1. Player web/mobile runtime under `docs/`, wrapped by the Android WebView application.
2. Venue/front-desk operations console under `admin/`.
3. HQ/central administration under `admin/app/hq` and `/admin` backend APIs.

Do not merge HQ responsibilities into venue operations or vice versa.

## Player milestone — manually accepted 25 Aug 2026

The user has manually tested and accepted the current Android/player booking flow after the August runtime stabilization work.

Accepted behavior includes:

- persistent player login and email password reset;
- password visibility and password requirement feedback;
- Google sign-in intentionally disabled/deferred because the user does not want to enable Google Cloud billing;
- venue discovery/detail, favourites and directions;
- light/dark player themes;
- booking Date → Court → Time → Review → Payment → Confirmation;
- booking step navigation and Android WebView scrolling after repeated back/forward navigation;
- native Review Booking screen rather than the old review iframe;
- live player identity and additional-player count;
- consecutive multi-slot selection represented as one booking session;
- wallet removed from checkout while the wallet feature is disabled;
- confirmation and Digital Pass use the newly created backend booking rather than prototype booking IDs;
- booking-level QR/check-in semantics: one pass covers the complete booked session, and a repeat scan reports already checked in rather than granting another admission;
- My Bookings uses backend data without flashing the old 22-Aug prototype booking;
- My Bookings CSS is preloaded so the loading state does not resize after first paint;
- Android system/back-edge handling was added to the native wrapper and requires the updated APK version when testing native back behavior.

Do not reopen these areas without a concrete reproduced regression.

### Player runtime ownership

- `docs/review-entry.js`: booking flow/session ownership.
- `docs/review-native.js`: native Review Booking screen and Review → Payment handoff.
- `docs/player-venues-live.js`: API-driven venue directory/detail.
- `docs/player-bookings-live.js`: My Bookings.
- `docs/player-booking-detail-live.js`: booking detail/reschedule/cancel/refund.
- `docs/digital-pass-live.js`: live Digital Pass.
- `docs/booking-success-live.js`: live booking confirmation.
- `docs/player-profile-live.js`: profile/auth/logout/avatar.
- `docs/notifications-live.js`: notifications.
- `docs/profile-modules.js`: Saved Players, Favourite Venues and Help & Support only.
- `docs/theme-bridge.js`: player theme.
- `docs/deep-router.js` / `docs/deep-route-smooth.js`: remaining deep-page navigation.
- `docs/android-back.js` plus Android `MainActivity.java`: native/system back contract.

Prototype content in `docs/index.html` must never be allowed to become visible runtime data. Initial My Bookings/confirmation/pass markup should remain neutral loading placeholders.

## Booking model

A booking may contain multiple consecutive one-hour slots. They form one continuous booking session and one booking ID/pass.

Example: 18:00–19:00 + 19:00–20:00 is one two-hour booking, not two admissions. Non-consecutive selected slots must be rejected/guarded.

Player count and slot count are separate concepts. Confirmation and pass should show the complete session duration and correct player count.

QR/check-in is booking-level. The first valid scan checks in the booking session. Re-scanning the same booking should show its already-checked-in state.

## Venue operations — manually accepted

The venue/front-desk console has been manually accepted for:

- manager/operator login and venue assignment;
- Court Schedule;
- Bookings search/list/detail;
- real check-in;
- Closures & Maintenance;
- court Active/Maintenance/Closed controls;
- front-desk New Booking using live availability/pricing and real paid booking creation;
- Payments & Refunds;
- Bookable Hours & Pricing;
- Reports;
- player search/registration and duplicate protection;
- Players sidebar integration.

Pricing rules are also the bookable schedule. An hour is exposed only when an active pricing rule covers that court/date/weekday/hour. Occupied priced slots remain visible as booked; elapsed, blocked and unpriced hours are hidden.

General Bookings is ordered by booking creation activity (`created_at DESC`). Court Schedule remains chronological by session time.

## HQ / central administration

HQ is the next product-review focus after the accepted player milestone.

The scalable venue provisioning flow is retained:

- `admin/app/hq/provisioning/page.tsx`: searchable Venue Directory and Create New Venue.
- `admin/app/hq/provisioning/manage/page.tsx?venue=<id>`: venue management for courts, bookable hours/pricing, staff assignments, activation/deactivation and safe cleanup.

Safe cleanup rules:

- unused courts may be deleted;
- courts with booking history are preserved and closed;
- pricing/bookable-hour rules are disabled rather than hard-deleted;
- venue staff assignments may be removed without deleting staff accounts;
- venues may be activated/deactivated;
- permanent venue deletion is allowed only when the venue has no booking history, no courts and no active staff assignments.

### HQ review warning

`admin/app/hq/page.tsx` still contains an older all-in-one HQ interface with dashboard/venues/pricing/bookings/staff/policies/refunds. Do not assume this legacy page represents the intended final HQ information architecture. Review it against the newer dedicated HQ routes (`provisioning`, `finance`, `reports`, `audit`) and eliminate duplicated/legacy ownership only after confirming navigation and backend coverage.

## Backend ownership

- `backend/app/api/operations.py`: venue bookings/check-in/blocks and general venue access.
- `backend/app/api/operations_management.py`: player search, front-desk booking, venue pricing, finance/refunds and reports.
- Central HQ endpoints remain under `/admin` and are separate from venue operations.

## Permissions

- Venue operator: view venue data, search/register players, create front-desk bookings, check in, view pricing, finance and reports.
- Venue manager/admin: operator abilities plus closures, court-status changes, pricing mutations and refund processing.
- Central admin/HQ: central `/admin` administration.

## Development discipline

- Work on `backend-v1-dev` unless the user explicitly changes the branch.
- Inspect repository/runtime before changing behavior.
- Prefer one clear runtime owner per feature.
- Do not add speculative click interceptors, CSS patches or duplicate feature modules.
- Keep player prototype HTML neutral so live modules never visibly replace fake data.
- Distinguish implementation, green CI and manual acceptance in every handoff.
- Update this file and `docs/NEXT_CHAT_PROMPT.md` when a durable product/architecture decision or manual-review milestone changes.
