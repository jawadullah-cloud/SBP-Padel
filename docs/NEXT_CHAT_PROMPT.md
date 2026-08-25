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
The HQ architecture was consolidated on 25 Aug 2026 and now needs user manual review. Do not reopen accepted player or venue-operations workflows unless a concrete regression is reproduced.

### Current HQ ownership
- `/hq`: central dashboard plus cross-venue Bookings, Staff Accounts, Policies and Refund workflow.
- `/hq/provisioning`: searchable Venue Directory and Create New Venue.
- `/hq/provisioning/manage?venue=<id>`: courts, Bookable Hours & Pricing, venue staff assignment, activation/deactivation and safe cleanup.
- `/hq/reports`: venue performance, current-month default period, summary metrics.
- `/hq/finance`: payment/refund/net collection summary and reconciliation batches, current-month default period.
- `/hq/audit`: audit log with text and actor-role filters.
- `HQTools.tsx`: shared HQ navigation/sign-out.

The former duplicate venue/pricing ownership was removed from HQ Home. Create venue staff accounts centrally under Staff, then assign managers/operators inside the selected venue's management page.

### HQ manual-review flow
After pulling/restarting the admin portal, test in this order:
1. HQ login and Overview metrics/navigation.
2. Venue Directory search/create and per-venue management.
3. Cross-venue Bookings filters/search.
4. Staff account creation, then venue assignment in Venue Directory.
5. Policy publishing/history.
6. Refund requested → processing → completed workflow using suitable test data.
7. Reports date filtering and summary totals.
8. Finance date filtering and reconciliation generation.
9. Audit search/role filtering.
10. Shared HQ navigation and sign-out from dedicated routes.

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
