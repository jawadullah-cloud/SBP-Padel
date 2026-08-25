# SBP-Padel — Next Chat Handoff Prompt

Continue active development of **SBP-Padel** from the current `backend-v1-dev` branch.

## Mandatory startup

Use the connected GitHub repository immediately:

- Repository: `jawadullah-cloud/SBP-Padel`
- Working branch: `backend-v1-dev`

Before discussing or changing anything:

1. Inspect the current HEAD of `backend-v1-dev`.
2. Read this file completely.
3. Read `docs/PROJECT_MEMORY.md` completely.
4. Read the durable repository documentation and implementation relevant to the current task.
5. Inspect recent commits around HEAD.
6. Treat repository state and actual runtime behavior as the source of truth.

This is a continuation of an existing project, not a new project.

## Current priority — HQ / central administration product review

The Android/player booking lifecycle and the venue/front-desk operations console have reached manually accepted milestones. The next product-review focus is **HQ / central administration**.

Inspect the actual current HQ navigation and implementation before changing it. In particular compare:

- `admin/app/hq/page.tsx` — older all-in-one HQ dashboard containing dashboard, venues, pricing, bookings, staff, policies and refunds;
- `admin/app/hq/provisioning/page.tsx` — scalable Venue Directory / Create New Venue entry;
- `admin/app/hq/provisioning/manage/page.tsx` — per-venue management;
- `admin/app/hq/finance`;
- `admin/app/hq/reports`;
- `admin/app/hq/audit`;
- the actual `/admin` backend endpoints and current admin navigation.

The goal is to identify unfinished, duplicated or legacy HQ ownership and continue toward a coherent central-administration product **without disturbing the already accepted venue console**.

Do not blindly delete the older all-in-one page. First establish what routes are actually reachable, what functionality is duplicated, and whether any capabilities exist only there.

## Locked player milestone — manually accepted 25 Aug 2026

The user manually tested and accepted the current installed Android/player runtime after the August booking-lifecycle stabilization.

Accepted behavior includes:

- login persistence and email password reset;
- password visibility and password-combination feedback;
- Google sign-in intentionally disabled/deferred because enabling Google Cloud billing is not desired;
- API-driven venue discovery/detail, favourites and directions;
- light/dark theme;
- booking Date → Court → Time → Review → Payment → Confirmation;
- repeated booking back/forward navigation without the Android WebView scroll freeze;
- native Review Booking screen, including clickable steps 1–5 and working Review → Payment transition;
- correct signed-in player and additional-player count;
- consecutive multi-slot bookings represented as one continuous booking session;
- wallet removed from checkout while the wallet feature is disabled;
- live backend-owned confirmation and Digital Pass with no hard-coded prototype booking;
- booking-level QR/check-in behavior: one QR covers the whole booked session; repeat scan reports already checked in;
- My Bookings live backend data without the stale 22-Aug prototype flash;
- stable My Bookings loading typography with its CSS preloaded;
- Android system/edge-back integration in the updated native wrapper/APK.

Do not reopen these player areas without a concrete reproduced regression.

### Player runtime ownership

- `docs/review-entry.js` owns booking session/flow state.
- `docs/review-native.js` owns the native Review Booking screen and Review → Payment handoff.
- `docs/player-venues-live.js` owns live venue discovery/detail from `GET /venues` and `GET /venues/{id}`.
- `docs/notifications-live.js` owns Notifications.
- `docs/player-bookings-live.js` owns My Bookings.
- `docs/player-booking-detail-live.js` owns booking detail/reschedule/cancel/refund.
- `docs/booking-success-live.js` owns live confirmation.
- `docs/digital-pass-live.js` owns live Digital Pass.
- `docs/player-profile-live.js` owns profile/auth/menu/logout/avatar behavior.
- `docs/profile-modules.js` owns only Saved Players, Favourite Venues and Help & Support plus favourite persistence.
- `docs/theme-bridge.js` owns player theme state.
- `docs/android-back.js` plus Android `MainActivity.java` own the Android system-back contract.

Legacy/prototype data in `docs/index.html` must never become visible runtime booking/profile data. Keep initial My Bookings, confirmation and pass markup neutral/loading-only.

## Booking model decision

Multiple selected slots are allowed only when consecutive and form **one booking session**.

Example: 18:00–19:00 plus 19:00–20:00 is one two-hour booking with one booking ID and one Digital Pass. Player count is independent from slot count.

QR/check-in is booking-level. First valid scan checks in the booking session; subsequent scans show already checked in rather than granting another admission.

## Venue operations — manually accepted behavior

The user has manually accepted the current Next.js venue/front-desk console through:

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
- venue-side player registration and duplicate protection;
- Players integrated into the main sidebar.

Do not redesign or remove these accepted workflows without a concrete regression.

## Important operational decisions

### Bookable Hours & Pricing

Pricing rules are also the booking schedule.

- A one-hour slot exists only when an active pricing rule covers that court/date/weekday/hour.
- Example: 18:00–20:00 exposes 18:00–19:00 and 19:00–20:00.
- Hours without an active pricing rule are hidden.
- A priced occupied slot remains visible as Booked/unavailable.
- Elapsed, administratively blocked or unpriced hours are hidden.

The availability behavior is enforced centrally by `backend/app/api/routes.py`.

### Booking sorting

- General Bookings is activity/history and is ordered by `Booking.created_at DESC`.
- Court Schedule remains chronological by actual session time.

### Front-desk booking completion

After a successful staff-created booking, clear booking filters, reload the full venue booking list, switch to Bookings, and open the newly created booking in the detail drawer.

## Venue operations backend

`backend/app/api/operations.py` owns venue bookings/check-in/blocks and general venue access.

`backend/app/api/operations_management.py` owns player search, front-desk booking, venue pricing, finance/refunds and reports.

Venue-side player registration uses normal `UserRole.player` accounts with duplicate email/phone protection and a one-time temporary password for walk-in registration.

## HQ / central administration decisions already retained

HQ remains separate from venue operations.

Current scalable provisioning flow:

1. `admin/app/hq/provisioning/page.tsx` is the Venue Directory. It lists/searches venues and exposes Create New Venue.
2. Selecting a venue opens `admin/app/hq/provisioning/manage/page.tsx?venue=<id>`.
3. Venue management owns courts, Bookable Hours & Pricing, staff assignment, activation/deactivation and safe cleanup.

Do not revert provisioning to a single venue dropdown as the primary flow.

Safe cleanup:

- unused courts may be permanently deleted;
- courts with booking history are preserved and closed;
- pricing rules are disabled rather than hard-deleted;
- staff assignments can be removed without deleting staff accounts;
- venues can be activated/deactivated;
- permanent venue deletion requires no booking history, no courts and no active staff assignments.

## Permissions retained

- Venue operator: view venue data, search/register players, create front-desk bookings, check in, view pricing, finance and reports.
- Venue manager/admin: operator abilities plus closures, court-status changes, pricing mutations and refund processing.
- Central admin/HQ endpoints under `/admin` remain separate.

## Verification discipline

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's runtime manually accepted.

Do not claim behavior is fixed merely because code exists in Git.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

When manual review is required, provide only the minimal pull/restart commands and the exact flow to inspect.
