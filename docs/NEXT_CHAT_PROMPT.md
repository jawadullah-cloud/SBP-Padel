# SBP-Padel — Next Chat Handoff Prompt

Continue `jawadullah-cloud/SBP-Padel` on `backend-v1-dev`. Inspect HEAD, read this file and `docs/PROJECT_MEMORY.md`, inspect relevant implementation/recent commits, and treat repository/runtime/CI as source of truth.

## Current accepted state — 26 Aug 2026
The governance/gallery/player-discovery work through 26 Aug 2026 has been manually reviewed and accepted. Do not reopen accepted behavior without a reproduced regression.

### Player discovery/location — accepted
- `docs/index.html` directly loads the live venue/discovery runtimes; do not rely only on dev-server injection for critical player discovery features.
- `discovery-tools.js` owns the visible Find Your Court controls. Search is live; **All / Near Me** are visible; city choices must be generated from active venues, never hard-coded to Lahore.
- `player-discovery-live.js` owns dynamic venue filtering, distance ranking and live Next Available.
- Android location is obtained primarily through the native Fused Location Provider bridge in `MainActivity.java`; WebView geolocation is fallback only.
- Current accepted Android debug wrapper is `0.12-debug` / versionCode 12.
- **Near Me = active venues within 15 km only**, sorted nearest first with distance shown. If none are within 15 km, show a clear empty-nearby state. Never display every Punjab facility under Near Me.
- **Next Available = real availability within the same 15 km radius** when location is available. It must not silently select a distant venue/city merely because it has an earlier slot. If no nearby slot exists, say so and allow browsing all venues.
- A live Next Available result must carry its actual venue/date/court/slot into the booking flow.

### Venue cover/gallery — accepted
- Venue Management Facility Photos supports up to 12 images, captions, cover selection, reorder and delete.
- Reorder uses a temporary collision-free position range because `VenueImage.position` is unique; do not regress to direct swaps.
- Public `/venues/{venue_id}/gallery` feeds the player.
- Venue detail gallery swipes horizontally with cover first and page dots.
- Selected venue cover photo should propagate across Home featured, venue cards, Favourite Venues, My Bookings and booking/payment/confirmation/detail/pass surfaces that show a venue visual.
- Real photos must suppress the old generic court overlays and remain pointer-safe. Generic artwork is fallback only when no cover exists.

### Booking change policy
Player cancellation and rescheduling close **12 hours before the first booked slot**. Both are blocked after check-in or once the session starts. Eligible paid cancellations automatically create a refund request. Rescheduling still requires the new session to have the same total price. Shared logic: `backend/app/core/booking_policy.py`.

### HQ Refunds
Refund requests are **collapsed compact rows by default**. Click to expand complete review context: booking code, player/contact, venue/court, date/all slots, payment/amount/reference, cancellation reason/timing, check-in/utilization and the 12-hour policy. Admin can process, reject and complete refunds. Do not reduce this back to UUID-only rows.

### HQ Bookings
HQ booking rows are also collapsed by default. Expanded detail includes player/contact, court, all slots, duration, payment, utilization/check-in, pricing, cancellation/refund context, creation time and UUID. Statuses remain semantically color-coded.

### HQ Staff / roles
Fixed roles remain `player`, `venue_operator`, `venue_manager`, `admin`. Do not add arbitrary custom roles unless a real permission-matrix requirement emerges. HQ Staff shows permission summaries and supports Disable/Reactivate. Permanent delete is only for staff with no operational/audit/assignment history; otherwise disable. Self-disable/delete is blocked.

### HQ navigation/auth/layout
Dedicated HQ routes are gated before rendering. Switching between HQ pages must not flash the login screen. HQ uses one left sidebar, no floating global toolbar. Venue Management/provisioning content must render in the shared content column beside the sidebar; do not reintroduce independent page offsets/overlap.

### Activity & Audit Trail
`/hq/audit` is management-facing. It translates technical events into readable actions. Raw API/action/entity/payload data is available only under optional Technical details.

## Locked accepted booking lifecycle
Player booking lifecycle and venue/front-desk operations are accepted. Consecutive slots are one booking/session/pass; player count is independent; QR/check-in is booking-level. Review/payment/confirmation/digital pass/My Bookings repeated navigation and Android system back were previously manually accepted.

## Local Android test discipline
Use the current laptop IPv4 on the same Wi-Fi:
- backend: `run_backend_lan.ps1 -LanIp <IP>` → port 8000
- player: `run_player_dev.ps1 -LanIp <IP>` → port 5173 and must bind to `0.0.0.0`
Before changing app code for a black screen or stale runtime, verify from the phone browser:
- `http://<IP>:5173/auth-preview.html`
- `http://<IP>:8000/docs`
The cache-free dev server injects a DEV commit badge. If the user says a committed change is not visible, establish exactly which player code is being served/executed before making another patch.

## Verification discipline
Distinguish implementation, green CI and manual acceptance. Do not claim a new feature is accepted until the user has actually reviewed it on the running app.

## Suggested next work
Continue player-app/manual product review from the next unreviewed surface or functionality. Inspect the current implementation first rather than assuming the next priority from old chat history. Preserve all locked accepted behavior while making changes.
