# SBP-Padel — Durable Project Memory

Updated: 26 August 2026
Working branch: `backend-v1-dev`

## Source of truth
Repository state, runtime behavior, completed CI and explicit manual acceptance are the source of truth. Never infer runtime success merely from committed code.

## Product surfaces
1. Player web/mobile runtime under `docs/`, wrapped by Android WebView.
2. Venue/front-desk operations console under `admin/`.
3. HQ/central administration under `admin/app/hq` and `/admin` APIs.
HQ and venue operations remain separate products.

## Player milestone — manually accepted 25 Aug 2026
Accepted: login persistence/recovery, venue discovery/favourites/directions, themes, Date → Court → Time → Review → Payment → Confirmation, stable repeated navigation, live player/additional-player count, consecutive multi-slot booking as one session, wallet hidden while disabled, backend confirmation/pass, booking-level QR/check-in, live My Bookings without prototype/layout flash, Android system back. Google sign-in remains intentionally deferred.

### Player runtime ownership
`review-entry.js` booking state; `review-native.js` review/payment handoff; `player-venues-live.js` venue detail and real facility gallery; `player-bookings-live.js` My Bookings; `player-booking-detail-live.js` detail/reschedule/cancel/refund; `digital-pass-live.js` pass; `booking-success-live.js` confirmation; `player-profile-live.js` profile/auth; `notifications-live.js` notifications; `profile-modules.js` Saved Players/Favourites/Help; `theme-bridge.js` theme; `android-back.js` + MainActivity native back.

## Booking model and change policy
Consecutive selected slots form one booking session and one pass. Player count is independent from slot count. QR/check-in is booking-level.

**Cancellation/rescheduling cutoff: 12 hours before the first booked slot.** Player cancellation/rescheduling is blocked once the booking is inside 12 hours, has started, or has been checked in. Eligible paid cancellations create a refund request automatically. HQ retains administrative discretion for exceptional/manual cases. The shared policy calculation is `backend/app/core/booking_policy.py` and must use the venue timezone with Pakistan/Windows fallback.

Rescheduling currently requires the replacement session to have the same total price; price-adjusted rescheduling remains a future enhancement.

## Refund governance
HQ Refunds is a decision screen, not a bare queue. It must expose booking code, player/contact, venue/court, date and all slots, amount/payment reference, cancellation reason/timing, check-in/utilization state and the 12-hour rule before an admin processes/rejects a refund. Completed refund processing updates payment status.

## Venue operations — manually accepted
Accepted: manager/operator venue assignment, Court Schedule, booking search/detail, check-in, closures, court status, front-desk booking, payments/refunds, pricing/bookable hours, reports, player registration/search. Pricing rules define the visible booking schedule. General Bookings sorts by creation activity; Court Schedule is chronological.

## HQ architecture
HQ Home owns overview, cross-venue bookings, staff accounts, policies and refund decisions. Dedicated routes: `/hq/provisioning`, per-venue management, `/hq/reports`, `/hq/finance`, and `/hq/audit`.

HQ uses one left-side navigation model. Dedicated HQ routes are gated before render so switching pages must not flash the login screen.

Booking statuses use semantic colors: green for positive/complete, amber for pending/rescheduled, red for cancelled/failed/rejected, neutral for non-action states.

### Staff roles and lifecycle
Built-in roles are intentionally fixed: `player`, `venue_operator`, `venue_manager`, `admin`. Do not add arbitrary user-defined roles without a demonstrated permission-model requirement. HQ Staff shows a readable permission summary for the three staff roles.

Staff accounts can be disabled/reactivated. Authentication rejects inactive accounts. Permanent staff deletion is allowed only when there is no operational/audit/assignment history; otherwise disable the account to preserve accountability. An HQ admin cannot disable/delete their own current account.

### Activity & Audit Trail
`/hq/audit` is management-facing. Default presentation must translate technical API actions into readable activities (check-in, pass validation, pricing change, closure, staff assignment, court/venue change, refund, reconciliation, front-desk booking). Raw action/entity/payload information belongs behind optional Technical details.

### Facility photo gallery
HQ Venue Management exposes Facility Photos. Up to 12 images per venue can be uploaded, reordered, deleted and one selected as cover. Storage currently uses database-backed image data URLs through `VenueImage`; production object storage can replace the storage layer later without changing gallery semantics. Public `/venues/{id}/gallery` feeds the player app. Player venue detail uses horizontal touch/swipe scrolling with cover image first and dot/page feedback.

Safe venue cleanup: unused courts may be deleted; courts with booking history preserved/closed; pricing rules disabled; staff assignments removable without deleting accounts; venues deactivate/reactivate; permanent venue deletion requires no booking history, courts or active staff assignments.

## Backend ownership
- `operations.py`: venue bookings/check-in/blocks.
- `operations_management.py`: venue-side front desk, pricing, finance/refunds/reports.
- `admin.py`, `admin_hq.py`, `admin_finance.py`, `admin_reports.py`: core HQ.
- `admin_governance.py`: detailed refund review, staff lifecycle and role-permission summaries.
- `venue_gallery.py`: public and HQ facility gallery APIs.
- `booking_policy.py`: 12-hour player change eligibility.

## Development discipline
Work on `backend-v1-dev`; inspect repository/runtime first; prefer one owner per feature; distinguish implementation, CI and manual acceptance; keep prototype player HTML neutral; update this file and `NEXT_CHAT_PROMPT.md` for durable decisions.
