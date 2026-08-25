# SBP-Padel — Next Chat Handoff Prompt

Continue active development of **SBP-Padel** from `backend-v1-dev` in `jawadullah-cloud/SBP-Padel`.

## Mandatory startup
1. Inspect current branch HEAD.
2. Read this file completely.
3. Read `docs/PROJECT_MEMORY.md` completely.
4. Inspect implementation/recent commits relevant to the task.
5. Treat repository state and actual runtime behavior as source of truth.

This is a mature continuation, not a new project.

## Current priority — manual HQ product review
The HQ architecture and shell were consolidated/refined on 25 Aug 2026 and now need user manual review. Do not reopen accepted player or venue-operations workflows unless a concrete regression is reproduced.

### Current HQ ownership
- `/hq`: central dashboard plus cross-venue Bookings, Staff Accounts, Policies and Refund workflow.
- `/hq/provisioning`: searchable Venue Directory and Create New Venue.
- `/hq/provisioning/manage?venue=<id>`: courts, Bookable Hours & Pricing, venue staff assignment, activation/deactivation and safe cleanup.
- `/hq/reports`: venue performance with local current-month default period and summary metrics.
- `/hq/finance`: payment/refund/net collection summary and reconciliation batches with local current-month default period.
- `/hq/audit`: audit log with text and actor-role filters.
- `HQTools.tsx`: shared left-side HQ navigation/sign-out on dedicated HQ routes.
- `admin/app/hq-shell.css`: HQ shell, dashboard action panels and responsive behavior.

The former floating HQ toolbar is intentionally removed. Do not reintroduce it. HQ uses the left sidebar as its primary navigation. Venue-operation-only Players/Scan Pass links are intentionally excluded from HQ.

The former duplicate venue/pricing ownership was removed from HQ Home. Create venue staff accounts centrally under Staff, then assign managers/operators inside the selected venue's management page.

### HQ Home purpose
The dashboard now surfaces more than static metrics:
- province-wide venue/court/player/confirmed-booking/paid-revenue/refund metrics;
- recent booking activity;
- pending-refund attention;
- audit oversight;
- venue-network status;
- navigational cards to Venue Directory, Reports, Finance and Audit.

Money values are displayed as whole PKR amounts with thousands separators where appropriate.

### Date-handling decision
Reports and Finance must derive initial dates in local calendar time. Do not use `Date.toISOString()` for month-start/current-date defaults because Pakistan-local midnight can become the prior UTC date.

### HQ manual-review flow
After pulling/restarting the admin portal, test in this order:
1. HQ login and Overview dashboard: sidebar, metrics, recent booking activity, attention panel and shortcut cards.
2. Bookings filters/search and displayed money/status formatting.
3. Staff account creation/listing.
4. Policy publishing/history.
5. Refund requested → processing → completed workflow using suitable test data.
6. Venue Directory search/create and per-venue management, including shared sidebar state.
7. Reports: confirm the default start date is the 1st of the current local month, run custom periods and verify summary totals.
8. Finance: confirm the same local-date behavior, refresh summary and generate reconciliation.
9. Audit: search, actor-role filter and refresh.
10. Navigate between dedicated routes only through the shared HQ sidebar and test sign-out.

Do not mark HQ manually accepted until the user completes this review.

## Locked player milestone — manually accepted 25 Aug 2026
Accepted: login persistence/email reset/password UI; Google sign-in deferred; venue discovery/detail/favourites/directions; light/dark theme; complete booking flow; repeated back/forward scrolling stability; native Review and step navigation; multi-player count; consecutive multi-slot booking as one session; wallet removed; backend-owned confirmation/pass; booking-level QR/check-in; live My Bookings without stale-data/layout flash; Android system/edge-back.

Player ownership: `review-entry.js` flow state; `review-native.js` Review; `player-venues-live.js` venues; `player-bookings-live.js` My Bookings; `player-booking-detail-live.js` booking detail; `booking-success-live.js` confirmation; `digital-pass-live.js` pass; `player-profile-live.js` profile/auth; `notifications-live.js` notifications; `profile-modules.js` Saved Players/Favourites/Help; `theme-bridge.js` theme; `android-back.js` + `MainActivity.java` native back.

Prototype `docs/index.html` data must never become visible runtime booking/profile data.

## Booking model
Consecutive selected slots form one booking session, booking ID and Digital Pass. Player count is separate from slot count. First valid QR scan checks in the booking session; repeat scans report already checked in.

## Venue operations — manually accepted
Accepted: manager/operator login and venue assignment; Court Schedule; Bookings search/list/detail; check-in; Closures & Maintenance; court status; front-desk New Booking; Payments & Refunds; Bookable Hours & Pricing; Reports; player search/registration/duplicate protection; Players sidebar.

Pricing rules are the booking schedule. Unpriced, elapsed or blocked hours are hidden; occupied priced hours remain visible as booked. General Bookings sorts by `created_at DESC`; Court Schedule stays chronological.

## HQ safe cleanup
Unused courts may be deleted. Courts with booking history are preserved/closed. Pricing rules are disabled rather than hard-deleted. Venue staff assignments can be removed without deleting staff accounts. Venues can be activated/deactivated. Permanent venue deletion requires no booking history, no courts and no active staff assignments.

## Permissions
- Venue operator: view venue data, search/register players, create front-desk bookings, check in, view pricing/finance/reports.
- Venue manager/admin: operator abilities plus closures, court-status changes, pricing mutations and refund processing.
- Central admin/HQ: central `/admin` administration.

## Verification discipline
Always distinguish implementation committed, automated CI green, and user runtime manually accepted. Work autonomously through investigation → implementation → CI/runtime QA → fixes → regression QA. Do not add duplicate feature owners or speculative patches.
