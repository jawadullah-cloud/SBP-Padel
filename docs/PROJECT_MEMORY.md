# SBP-Padel — Durable Project Memory

Updated: 25 August 2026
Working branch: `backend-v1-dev`

## Source of truth
The repository, current branch HEAD, actual runtime behavior and completed CI are the source of truth. Do not assume a change works merely because it exists in Git. User manual acceptance is recorded separately from implementation and CI.

## Product surfaces
1. Player web/mobile runtime under `docs/`, wrapped by Android WebView.
2. Venue/front-desk operations console under `admin/`.
3. HQ/central administration under `admin/app/hq` and `/admin` backend APIs.

HQ and venue operations are separate products with separate permissions and responsibilities.

## Player milestone — manually accepted 25 Aug 2026
The user manually tested and accepted the current Android/player booking flow after the August runtime stabilization work. Accepted behavior includes login persistence and email password reset; password visibility/requirements; Google sign-in intentionally deferred; venue discovery/detail/favourites/directions; light/dark theme; Date → Court → Time → Review → Payment → Confirmation; repeated back/forward navigation without WebView scroll freeze; native Review and working step navigation/payment handoff; live player/additional-player count; consecutive multi-slot booking as one session; wallet removed while disabled; backend-owned confirmation/Digital Pass; booking-level QR/check-in; live My Bookings without prototype flash or typography flash; and Android system/edge-back integration.

Do not reopen these areas without a concrete reproduced regression.

### Player runtime ownership
- `docs/review-entry.js`: booking session/flow state.
- `docs/review-native.js`: Review Booking and Review → Payment.
- `docs/player-venues-live.js`: venue directory/detail.
- `docs/player-bookings-live.js`: My Bookings.
- `docs/player-booking-detail-live.js`: booking detail/reschedule/cancel/refund.
- `docs/digital-pass-live.js`: Digital Pass.
- `docs/booking-success-live.js`: confirmation.
- `docs/player-profile-live.js`: profile/auth/logout/avatar.
- `docs/notifications-live.js`: notifications.
- `docs/profile-modules.js`: Saved Players, Favourite Venues, Help & Support.
- `docs/theme-bridge.js`: player theme.
- `docs/android-back.js` + Android `MainActivity.java`: native/system back.

Prototype content in `docs/index.html` must never become visible runtime data. Initial booking/profile placeholders must stay neutral.

## Booking model
Multiple selected slots are allowed only when consecutive and form one booking session. Example: 18:00–19:00 + 19:00–20:00 is one two-hour booking with one booking ID/pass. Player count is independent from slot count. QR/check-in is booking-level: first valid scan checks in the session; subsequent scans report already checked in.

## Venue operations — manually accepted
Accepted workflows: manager/operator login and venue assignment; Court Schedule; Bookings search/list/detail; check-in; Closures & Maintenance; court status controls; front-desk New Booking; Payments & Refunds; Bookable Hours & Pricing; Reports; player search/registration and duplicate protection; Players sidebar integration.

Pricing rules are also the bookable schedule. A slot exists only when an active pricing rule covers its court/date/weekday/hour. Occupied priced slots remain visible as booked; elapsed, blocked and unpriced hours are hidden. General Bookings is ordered by `created_at DESC`; Court Schedule remains chronological by session time.

## HQ / central administration — consolidated and shell-refined 25 Aug 2026
The earlier all-in-one HQ ownership has been consolidated. `admin/app/hq/page.tsx` is the central HQ home and owns only cross-venue functions that do not belong to a dedicated operational area:

- province-wide dashboard/overview;
- cross-venue booking search;
- staff-account creation/listing;
- booking/cancellation policy publishing/history;
- refund workflow queue/status processing.

Dedicated HQ routes own the following:

- `/hq/provisioning`: Venue Directory and Create New Venue.
- `/hq/provisioning/manage?venue=<id>`: courts, bookable hours/pricing, venue staff assignment, venue status and safe cleanup.
- `/hq/reports`: venue-performance reporting with local current-month default period, summary metrics and date validation.
- `/hq/finance`: finance summary and reconciliation batches with local current-month default period and date validation.
- `/hq/audit`: audit history with search and actor-role filtering.

### HQ shell/navigation decision
HQ now uses one left-side navigation model instead of the previous duplicated floating bottom toolbar. `HQTools.tsx` renders the shared HQ sidebar on dedicated routes, while HQ Home uses the matching sidebar structure directly. Venue-operation-only links such as Players and Scan Pass are intentionally not injected into HQ navigation.

The sidebar is grouped into administration and network/control areas. Dedicated routes retain their page-specific actions but no longer require a second global navigation system.

`admin/app/hq-shell.css` owns the HQ-specific shell, shared navigation, dashboard action panels and responsive behavior. Do not reintroduce a floating HQ toolbar.

### HQ overview purpose
The central dashboard is actionable rather than decorative. In addition to province-wide metrics and shortcuts it now surfaces:

- recent booking activity across venues;
- pending refund attention;
- audit oversight entry;
- venue-network status;
- consistent whole-rupee money formatting.

The Venue Directory, Reports, Finance and Audit shortcut cards remain as navigational cards but the sidebar is the primary navigation system.

### HQ date handling
Reports and Finance must use local calendar dates rather than `Date.toISOString()` for the initial period. The UTC conversion previously caused Pakistan-local 1 August to display as 31 July. Use local `YYYY-MM-DD` formatting for current-month defaults.

### HQ ownership
The old duplicate venue creation/pricing ownership was removed from HQ Home. Venue staff accounts are created centrally on HQ Home, then assigned to a facility in Venue Directory.

Safe cleanup rules: unused courts may be deleted; courts with booking history are preserved/closed; pricing rules are disabled rather than hard-deleted; venue staff assignments may be removed without deleting staff accounts; venues may be activated/deactivated; permanent venue deletion requires no booking history, no courts and no active staff assignments.

HQ consolidation and shell refinement are implemented and CI-verified when the corresponding Admin Portal CI is green, but the updated runtime still requires user manual acceptance.

## Backend ownership
- `backend/app/api/operations.py`: venue bookings/check-in/blocks and general venue access.
- `backend/app/api/operations_management.py`: venue-side player search, front-desk booking, pricing, finance/refunds and reports.
- `backend/app/api/admin.py`, `admin_hq.py`, `admin_finance.py`, `admin_reports.py`: central HQ `/admin` capabilities.

## Permissions
- Venue operator: view venue data, search/register players, create front-desk bookings, check in, view pricing, finance and reports.
- Venue manager/admin: operator abilities plus closures, court-status changes, pricing mutations and refund processing.
- Central admin/HQ: central `/admin` administration.

## Development discipline
- Work on `backend-v1-dev` unless explicitly changed.
- Inspect repository/runtime before changing behavior.
- Prefer one clear runtime owner per feature.
- Do not add speculative click interceptors, CSS patches or duplicate feature modules.
- Distinguish implementation, green CI and manual acceptance.
- Update this file and `docs/NEXT_CHAT_PROMPT.md` when durable architecture or manual-review status changes.
