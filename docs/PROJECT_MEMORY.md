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
Accepted: login persistence/recovery, venue discovery/favourites/directions, themes, Date → Court → Time → Review → Payment → Confirmation, stable repeated navigation, live player/additional-player count, consecutive multi-slot booking as one session, wallet hidden while disabled, backend confirmation/pass, booking-level QR/check-in, live My Bookings without prototype/layout flash, Android system back, venue gallery/cover propagation, native Android location, Near Me filtering and nearby-aware Next Available.

**Google sign-in remains intentionally deferred.** The player login screen must not advertise Google sign-in until the complete browser/native OAuth flow is intentionally enabled, tested and manually accepted. `docs/GOOGLE_SIGNIN.md` is a deferred-integration note, not a statement that the feature is active. Player Flow CI has an architecture guard that fails if `Continue with Google` returns to `docs/auth-preview.html`.

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

**Rescheduled bookings remain active bookings.** A paid booking with status `rescheduled` must remain valid for venue pass/QR validation and check-in on its replacement date. `operations.py` and `operations_passes.py` share this behavior through explicit active-status sets, and targeted backend regression QA covers pay → reschedule → validate pass → operator check-in.

## Refund governance
HQ Refunds is a decision screen, not a bare queue. Each refund request is a compact single-row summary by default and expands on click. Expanded review must expose booking code, player/contact, venue/court, date and all slots, amount/payment reference, cancellation reason/timing, check-in/utilization state and the 12-hour rule before an admin processes/rejects a refund. Completed refund processing updates payment status.

## HQ bookings
HQ Bookings follows the same compact-review pattern: each booking is collapsed by default with booking code, venue, date, semantic status and amount. Expanding a row retrieves/shows detailed player/contact, court, all slots, duration, payment, check-in/utilization, pricing, cancellation/refund context, creation time and UUID. Booking statuses use semantic colors: green for positive/complete, amber for pending/rescheduled, red for cancelled/failed/rejected, neutral for non-action states.

## Venue operations — manually accepted baseline; unattended hardening pending manual review
The previously reviewed baseline remains accepted: manager/operator venue assignment, Court Schedule, booking search/detail, check-in, closures, court status, front-desk booking, payments/refunds, pricing/bookable hours, reports, player registration/search. Pricing rules define the visible booking schedule. General Bookings sorts by creation activity; Court Schedule is chronological.

An unattended 26 Aug hardening pass added objective safeguards that require morning manual review but do not redesign the accepted UI:
- operations login no longer embeds/prefills the development manager email/password;
- the selected venue is authoritative during multi-venue operations: slower responses from a previously selected venue are discarded instead of overwriting the current venue;
- changing venue clears venue-scoped transient state, including selected booking, front-desk player/court/slots/quote/payment reference, closure court and pricing court;
- operator versus manager controls remain role-scoped: operators can view pricing/closures/courts but cannot mutate manager-only settings;
- confirmed and rescheduled paid bookings are both eligible for pass validation/check-in;
- `admin/tests/operations.spec.ts` covers blank staff credentials, stale-response rejection, role-scoped controls, My Account visibility and venue-switch clearing.

Do not mark this new hardening pass manually accepted until it is reviewed on the running operations UI.

## HQ architecture
HQ Home owns overview, cross-venue bookings, policies and refund decisions. Staff credential/lifecycle management is a dedicated `/hq/staff` route. Dedicated network routes include `/hq/provisioning`, per-venue management/profile, `/hq/reports`, `/hq/finance`, and `/hq/audit`.

HQ uses one persistent left-side navigation model. Dedicated HQ routes are gated before render so switching pages must not flash the login screen. Dedicated pages must retain links to Overview, Bookings, Staff, Policies, Refunds, Venue Directory, Reports, Finance and Activity Trail; do not collapse the sidebar to network-only links. HQ provisioning layout uses a shared content frame beside the fixed sidebar; do not independently offset child pages again.

### Venue profile management
Venue records are not create-once data. HQ can edit a venue after creation through `/hq/provisioning/profile?venue=<id>` and `PATCH /admin/venues/{venue_id}`. Editable fields include name, city, address, description, latitude/longitude, opening/closing hours and amenities. Common amenities are selectable and custom amenities are allowed. Venue Directory exposes separate **Manage Venue** and **Edit Profile & Amenities** actions.

The venue UUID in the current route is authoritative navigation context. The profile page resolves `searchParams.venue` at the route boundary and passes that exact ID into the client editor; it must not choose the first venue, reuse a previous selection or fall back to stale local state. **Back to Venue Management** must always target `/hq/provisioning/manage?venue=<same-current-venue-id>`. Directory Manage/Edit actions and Facility Photos navigation preserve that same venue context. Admin browser QA covers two distinct venues and must fail if either venue returns to the other venue's management/gallery context.

Editing a venue profile must preserve courts, bookings, pricing, staff assignments, gallery and history. Coordinate changes intentionally affect player Near Me/Next Available ranking; profile/amenity changes propagate through live public venue APIs to player discovery/detail surfaces.

A previous globally rendered Venue Management profile shortcut caused a floating top-left button and was removed during the follow-up alignment pass. Do not reintroduce a page action through the shared HQ layout. Any direct profile shortcut from Venue Management should live inside that page's own header/action region.

### Staff roles, credentials and lifecycle
Built-in roles remain intentionally fixed: `player`, `venue_operator`, `venue_manager`, `admin`. Do not add arbitrary user-defined roles without a demonstrated permission-model requirement.

HQ staff management lives at `/hq/staff`. Staff creation uses a generated temporary password by default but allows manual entry, Show/Hide, Generate and Copy. After account creation, the exact temporary password remains visible client-side until explicitly dismissed or the page is left, so a missed initial copy does not immediately lose it. The server never stores readable passwords.

HQ admins can reset the password of any admin, venue manager or venue operator through `PATCH /admin/staff/{user_id}/password`; passwords are re-hashed server-side. Reset UX also provides Generate/Copy and keeps the newly chosen password visible client-side after success until dismissed/leave. Existing Disable/Reactivate/Delete lifecycle actions remain available. Authentication rejects inactive accounts. Permanent staff deletion is allowed only when there is no operational/audit/assignment history; otherwise disable the account to preserve accountability. An HQ admin cannot disable/delete their own current account.

**Self-service password changes:** authenticated HQ admins, venue managers and venue operators can change their own password through **My Account**. `admin/app/StaffAccountControl.tsx` chooses the active HQ or operations token and calls `POST /auth/change-password`. The user must supply the current password, a new password and matching confirmation. The backend verifies the current hash, applies the shared password policy, rejects reuse of the same password and stores only the new hash. HQ Reset Password remains the administrative recovery path. Targeted backend regression QA explicitly covers venue-manager and venue-operator accounts: wrong current password rejection, password-policy rejection, successful change, old-password login failure, new-password login success, and subsequent separate HQ admin reset.

### HQ venue action alignment — manually accepted 26 Aug 2026
The follow-up pass for Venue Management header actions, Facility Photos placement and Venue Directory card action sizing was manually reviewed and accepted. The global floating profile shortcut remains removed. Keep page toolbar actions aligned and Facility Photos inside the established page action region; do not reintroduce the earlier floating/stacked action behavior.

### Activity & Audit Trail
`/hq/audit` is management-facing. Default presentation must translate technical API actions into readable activities (check-in, pass validation, pricing change, closure, staff assignment, court/venue change, refund, reconciliation, front-desk booking). Raw action/entity/payload information belongs behind optional Technical details.

### Facility photo gallery — manually accepted 26 Aug 2026
HQ Venue Management exposes Facility Photos. Up to 12 images per venue can be uploaded, reordered, deleted and one selected as cover. Storage currently uses database-backed image data URLs through `VenueImage`; production object storage can replace the storage layer later without changing gallery semantics. Public `/venues/{id}/gallery` feeds the player app. Player venue detail uses horizontal touch/swipe scrolling with cover image first and dot/page feedback.

Gallery reorder must avoid the `VenueImage` unique-position collision: persist reorder through a temporary collision-free position range before assigning final positions. The admin gallery UI uses clear Move Up / Move Down controls and immediate local movement with rollback on API failure.

Safe venue cleanup: unused courts may be deleted; courts with booking history preserved/closed; pricing rules disabled; staff assignments removable without deleting accounts; venues deactivate/reactivate; permanent venue deletion requires no booking history, courts or active staff assignments.

## Production readiness
`docs/LAUNCH_READINESS.md` is the durable production-readiness checklist. Important blockers that should not be disguised as completed product work include the real online payment provider, production database/migrations/backups, domains/HTTPS/CORS, SMTP, production secrets, Android release signing/distribution, and optionally object storage before image scale grows.

The player online payment path currently uses provider `unconfigured`; development simulator endpoints are deliberately unavailable outside development. Do not call player online payments production-ready until a real provider, callbacks/idempotency, reconciliation, failure handling and refund execution are integrated.

Production runtime must not use the repository default JWT secret. `validate_runtime_settings()` now rejects the default `change-this-in-production` value outside `development`/`test`, with backend regression coverage. Development behavior remains unchanged.

## Backend ownership
- `operations.py`: venue bookings/check-in/blocks.
- `operations_management.py`: venue-side front desk, pricing, finance/refunds/reports.
- `operations_passes.py`: venue pass/QR validation; confirmed and rescheduled active bookings are valid candidates.
- `admin.py`, `admin_hq.py`, `admin_finance.py`, `admin_reports.py`: core HQ and editable venue profile APIs.
- `admin_governance.py`: detailed refund review, staff lifecycle, password reset and role-permission summaries.
- `account.py`: authenticated self-service password change.
- `venue_gallery.py`: public and HQ facility gallery APIs.
- `booking_policy.py`: 12-hour player change eligibility.

## Local Android/LAN testing
For phone testing on the same Wi-Fi, run backend and player in LAN mode using the current laptop IPv4. `run_player_dev.ps1 -LanIp <IP>` must bind the player server to `0.0.0.0`; Android loads the player from port 5173 and backend from port 8000. Before blaming the APK, verify `http://<IP>:5173/auth-preview.html` and `http://<IP>:8000/docs` from the phone browser. The player dev server is cache-free and injects a DEV commit badge; service workers are disabled/unregistered for local development.

## Development discipline
Work on `backend-v1-dev`; inspect repository/runtime first; prefer one owner per feature; distinguish implementation, CI and manual acceptance; keep prototype player HTML neutral; update this file and `NEXT_CHAT_PROMPT.md` for durable decisions. When the user reports no visible change, stop layering fixes until the actual served/executed runtime path is established.
