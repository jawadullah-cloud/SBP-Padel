# SBP-Padel — Next Chat Handoff Prompt

Continue active development of **SBP-Padel** from the current `backend-v1-dev` branch.

## Mandatory startup

Use the connected GitHub repository immediately:

- Repository: `jawadullah-cloud/SBP-Padel`
- Working branch: `backend-v1-dev`

Before discussing or changing anything:

1. Inspect the current HEAD of `backend-v1-dev`.
2. Read this file (`docs/NEXT_CHAT_PROMPT.md`).
3. Read the repository's durable documentation and implementation relevant to the current task.
4. Inspect recent commits around HEAD.
5. Treat repository state and actual runtime behavior as the source of truth.

This is a continuation of an existing project, not a new project.

## Locked player web milestone

The user has manually accepted the player web runtime through the complete booking lifecycle, notifications, My Bookings/detail, reschedule/cancel/refund, account/profile/avatar, Wallet/Payment History, favourites, light/dark theme and smooth deep-route transitions including booking Review/Payment.

Do not reopen player work without a concrete reproduced regression.

## Player runtime ownership

- `docs/review-entry.js` owns Venue → Date → Court → Time → Review → Payment → Confirmation.
- `docs/notifications-live.js` owns Notifications.
- `docs/player-bookings-live.js` owns My Bookings.
- `docs/player-booking-detail-live.js` owns booking detail / reschedule / cancellation / refund state.
- `docs/player-profile-live.js` owns live profile/auth/menu/logout/avatar behavior.
- `docs/player-payment-history-live.js` owns Payment History.
- `docs/player-wallet-live.js` owns Wallet presentation/activity.
- `docs/profile-modules.js` owns only Saved Players, Favourite Venues and Help & Support sub-screens plus favourite persistence.
- `docs/theme-bridge.js` owns player theme state.
- `docs/deep-route-smooth.js` owns preload/reveal transitions for booking detail and booking Review/Payment entry.

Legacy `docs/player-account-live.js` must not be loaded by the effective runtime.

## Backend notes retained from player milestone

- `/payments/me` must be registered before generic `/payments/{payment_id}` routes in `backend/app/main.py`.
- Player avatars are account-backed through `UserProfile.avatar_data_url` and `/auth/me/avatar`.
- Wallet balance/top-up remains intentionally disabled until a real wallet ledger/funding workflow exists.

## Active milestone: venue/admin operational product

The existing Next.js admin portal under `admin/` is now being upgraded from a thin operations prototype into the venue/front-desk product.

Implemented for the first venue-operations review:

- `backend/app/api/operations.py` booking feed now returns live player identity/contact, court name/code/type, payment status/method/reference, booking total and check-in state.
- operations booking search now matches booking code, player name, email or phone.
- `admin/app/page.tsx` is now organized around Court Schedule, Bookings, Closures & Maintenance and Courts.
- Court Schedule is a date-based per-court operational view with player, booking, payment and check-in state.
- All Bookings provides date/search/status filtering and a booking-detail side drawer with player/contact, session, payment and check-in information.
- Check-in remains a real backend mutation and is available from both booking table/detail where appropriate.
- Closures can now be scoped to a specific court or all courts; existing manager/operator permissions remain intact.
- Court active/maintenance/closed management remains intact.
- `backend/tests/test_operations.py` now covers enriched operations booking context and searching by player email.
- `run_admin_dev.ps1` launches the Next.js admin runtime at `http://127.0.0.1:3000` with the local backend API.

Manual review is required for this first venue console before expanding to pricing, staff-created bookings, payment/refund operations and reporting.

## Verification discipline

The connected chat environment can edit/read GitHub but cannot clone GitHub into its container because outbound GitHub DNS is blocked. New QA can therefore be committed before its Actions results are visible through the connector.

Always distinguish:

- implementation committed;
- automated CI actually green;
- user's Windows runtime manually accepted.

## Working style

Work autonomously through investigation → implementation → runtime/CI QA → fixes → regression QA.

Do not add speculative click interceptors, CSS patches or duplicate feature owners.

Do not claim behavior is fixed merely because code exists in Git. State clearly what was code-reviewed, automatically tested, and manually verified.

When a manual review is required, provide only the minimal PowerShell pull/restart commands and the exact flow to inspect.
