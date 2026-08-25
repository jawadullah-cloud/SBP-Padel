# SBP-Padel — Durable Project Memory

Updated: 26 August 2026
Working branch: `backend-v1-dev`

## Source of truth
Repository state, actual runtime behavior, completed CI and explicit manual acceptance are the source of truth. Never infer runtime success merely from committed code or a green workflow. This project has repeatedly exposed cases where a committed/injected player runtime was not the code actually visible in the Android/WebView experience.

## Product surfaces
1. Player web/mobile runtime under `docs/`, wrapped by Android WebView.
2. Venue/front-desk operations console under `admin/`.
3. HQ/central administration under `admin/app/hq` and `/admin` APIs.
HQ and venue operations remain separate products.

## Player milestone — manually accepted 25–26 Aug 2026
Accepted: login persistence/recovery, venue discovery/favourites/directions, themes, Date → Court → Time → Review → Payment → Confirmation, stable repeated navigation, live player/additional-player count, consecutive multi-slot booking as one session, wallet hidden while disabled, backend confirmation/pass, booking-level QR/check-in, live My Bookings without prototype/layout flash, Android system back, venue gallery/cover propagation, native Android location, Near Me filtering and nearby-aware Next Available. Google sign-in remains intentionally deferred.

### Player runtime ownership
`review-entry.js` booking state; `review-native.js` review/payment handoff; `player-venues-live.js` venue detail and real facility gallery; `player-discovery-live.js` dynamic venue discovery, native-location ranking and live Next Available; `discovery-tools.js` visible Find Your Court search/filter controls; `venue-cover-runtime.js` shared venue cover propagation; `player-bookings-live.js` My Bookings; `player-booking-detail-live.js` detail/reschedule/cancel/refund; `digital-pass-live.js` pass; `booking-success-live.js` confirmation; `player-profile-live.js` profile/auth; `notifications-live.js` notifications; `profile-modules.js` Saved Players/Favourites/Help; `theme-bridge.js` theme; `android-back.js` + MainActivity native back/location bridge.

### Runtime loading discipline
Critical player features should not rely only on development-server script injection when they materially affect the visible shell. `docs/index.html` now directly loads the live venue/discovery runtime and uses neutral loading text instead of misleading prototype venue/slot data. When runtime behavior contradicts the repository, inspect `run_player_dev.ps1`, `dev_player_server.py`, `docs/index.html`, injected scripts, duplicate legacy modules, service-worker/cache behavior and the DEV build badge before making more UI patches.

## Venue discovery, covers and location — manually accepted 26 Aug 2026
Venue cover/gallery behavior is now live across the player experience. Once a venue has a selected cover photo, that image should replace generic court artwork on Home featured venue, venue cards, Favourite Venues, My Bookings and booking/payment/confirmation/pass/detail surfaces where a venue visual is shown. Generic artwork is only a fallback when no cover exists. Real photo surfaces must suppress the old `.courtScene`/`.courtVisual`/`.miniCourt` prototype overlays and must remain pointer-safe.

The visible Find Your Court UI is owned by `discovery-tools.js`; do not reintroduce hard-coded Lahore/court-type prototype filters. It exposes search plus **All / Near Me**, with city choices generated from actual active venues. Venue cards have deliberate vertical spacing.

Android location is obtained primarily through a native `FusedLocationProviderClient` bridge in `MainActivity.java` and passed to `player-discovery-live.js`; WebView `navigator.geolocation` is only a fallback. Android manifest includes coarse/fine location permissions. Current accepted Android debug wrapper is version `0.12-debug` (versionCode 12).

**Near Me means genuinely nearby:** only active venues within **15 km** of the phone's current coordinates are shown, sorted nearest first with distance displayed. If none are within 15 km, show an explicit no-nearby-venues state rather than falling back to all facilities.

**Next Available is live and nearby-aware:** it checks real venue availability and, when location is available, only selects candidates within the same 15 km nearby radius. It must never silently fall back to a distant city merely because that venue has an earlier slot. If no nearby venue has availability, communicate that and let the player browse all facilities. Tapping a live Next Available result must carry the actual venue/date/court/slot into the booking flow.

## Booking model and change policy
Consecutive selected slots form one booking session and one pass. Player count is independent from slot count. QR/check-in is booking-level.

**Cancellation/rescheduling cutoff: 12 hours before the first booked slot.** Player cancellation/rescheduling is blocked once the booking is inside 12 hours, has started, or has been checked in. Eligible paid cancellations create a refund request automatically. HQ retains administrative discretion for exceptional/manual cases. The shared policy calculation is `backend/app/core/booking_policy.py` and must use the venue timezone with Pakistan/Windows fallback.

Rescheduling currently requires the replacement session to have the same total price; price-adjusted rescheduling remains a future enhancement.

## Refund governance
HQ Refunds is a decision screen, not a bare queue. Each refund request is a compact single-row summary by default and expands on click. Expanded review must expose booking code, player/contact, venue/court, date and all slots, amount/payment reference, cancellation reason/timing, check-in/utilization state and the 12-hour rule before an admin processes/rejects a refund. Completed refund processing updates payment status.

## HQ bookings
HQ Bookings follows the same compact-review pattern: each booking is collapsed by default with booking code, venue, date, semantic status and amount. Expanding a row retrieves/shows detailed player/contact, court, all slots, duration, payment, check-in/utilization, pricing, cancellation/refund context, creation time and UUID. Booking statuses use semantic colors: green for positive/complete, amber for pending/rescheduled, red for cancelled/failed/rejected, neutral for non-action states.

## Venue operations — manually accepted
Accepted: manager/operator venue assignment, Court Schedule, booking search/detail, check-in, closures, court status, front-desk booking, payments/refunds, pricing/bookable hours, reports, player registration/search. Pricing rules define the visible booking schedule. General Bookings sorts by creation activity; Court Schedule is chronological.

## HQ architecture
HQ Home owns overview, cross-venue bookings, staff accounts, policies and refund decisions. Dedicated routes: `/hq/provisioning`, per-venue management, `/hq/reports`, `/hq/finance`, and `/hq/audit`.

HQ uses one left-side navigation model. Dedicated HQ routes are gated before render so switching pages must not flash the login screen. HQ provisioning layout uses a shared content frame beside the fixed sidebar; do not independently offset child pages again.

### Staff roles and lifecycle
Built-in roles are intentionally fixed: `player`, `venue_operator`, `venue_manager`, `admin`. Do not add arbitrary user-defined roles without a demonstrated permission-model requirement. HQ Staff shows a readable permission summary for the three staff roles.

Staff accounts can be disabled/reactivated. Authentication rejects inactive accounts. Permanent staff deletion is allowed only when there is no operational/audit/assignment history; otherwise disable the account to preserve accountability. An HQ admin cannot disable/delete their own current account.

### Activity & Audit Trail
`/hq/audit` is management-facing. Default presentation must translate technical API actions into readable activities (check-in, pass validation, pricing change, closure, staff assignment, court/venue change, refund, reconciliation, front-desk booking). Raw action/entity/payload information belongs behind optional Technical details.

### Facility photo gallery — manually accepted 26 Aug 2026
HQ Venue Management exposes Facility Photos. Up to 12 images per venue can be uploaded, reordered, deleted and one selected as cover. Storage currently uses database-backed image data URLs through `VenueImage`; production object storage can replace the storage layer later without changing gallery semantics. Public `/venues/{id}/gallery` feeds the player app. Player venue detail uses horizontal touch/swipe scrolling with cover image first and dot/page feedback.

Gallery reorder must avoid the `VenueImage` unique-position collision: persist reorder through a temporary collision-free position range before assigning final positions. The admin gallery UI uses clear Move Up / Move Down controls and immediate local movement with rollback on API failure.

Safe venue cleanup: unused courts may be deleted; courts with booking history preserved/closed; pricing rules disabled; staff assignments removable without deleting accounts; venues deactivate/reactivate; permanent venue deletion requires no booking history, courts or active staff assignments.

## Backend ownership
- `operations.py`: venue bookings/check-in/blocks.
- `operations_management.py`: venue-side front desk, pricing, finance/refunds/reports.
- `admin.py`, `admin_hq.py`, `admin_finance.py`, `admin_reports.py`: core HQ.
- `admin_governance.py`: detailed refund review, staff lifecycle and role-permission summaries.
- `venue_gallery.py`: public and HQ facility gallery APIs.
- `booking_policy.py`: 12-hour player change eligibility.

## Local Android/LAN testing
For phone testing on the same Wi-Fi, run backend and player in LAN mode using the current laptop IPv4. `run_player_dev.ps1 -LanIp <IP>` must bind the player server to `0.0.0.0`; Android loads the player from port 5173 and backend from port 8000. Before blaming the APK, verify `http://<IP>:5173/auth-preview.html` and `http://<IP>:8000/docs` from the phone browser. The player dev server is cache-free and injects a DEV commit badge; service workers are disabled/unregistered for local development.

## Development discipline
Work on `backend-v1-dev`; inspect repository/runtime first; prefer one owner per feature; distinguish implementation, CI and manual acceptance; keep prototype player HTML neutral; update this file and `NEXT_CHAT_PROMPT.md` for durable decisions. When the user reports no visible change, stop layering fixes until the actual served/executed runtime path is established.
