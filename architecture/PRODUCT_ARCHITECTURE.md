# SBP Padel Production Architecture

## Product boundary

The current `docs/` GitHub Pages application is the approved player-facing UI reference. Production development must preserve its information architecture and visual flow while replacing prototype/localStorage behavior with real services.

The production platform is split into four clients over one backend domain:

1. **Player application** — Android, Kotlin + Jetpack Compose.
2. **Administration portal** — Next.js + TypeScript for Sports Board Punjab central administrators.
3. **Venue operations portal** — Next.js + TypeScript for venue managers/reception staff.
4. **Public website** — Next.js + TypeScript for discovery and informational content.

The shared backend is **FastAPI + PostgreSQL**. Redis will be introduced for slot locks, short-lived availability caching and rate limiting before payment integration.

## Core domain

### Identity and access

- Player accounts
- SBP administrator accounts
- Venue manager/operator accounts
- Role-based permissions
- Phone/email verification
- Session/token management

### Facility hierarchy

`Venue -> Court`

A venue represents an SBP Padel facility anywhere in Punjab. Nishtar Park Sports Complex is the first venue, not a special-case root object.

Each venue stores location, coordinates, operating hours, amenities, contact information, images, opening/closure state and booking rules.

Each court belongs to one venue and stores court number/name, court type, capacity, surface/indoor-outdoor metadata and operational status.

### Availability and pricing

Pricing is not a single court fee. Each bookable slot resolves its price from configurable rules.

A pricing rule may vary by:

- venue
- court or court type
- day of week
- date range
- start/end time
- weekday/weekend
- special event/peak period

The API must return the **resolved price for every individual slot** so the player sees the exact rate before selecting it.

### Booking lifecycle

Primary states:

`draft -> pending_payment -> confirmed -> completed`

Exceptional states:

`cancelled`, `expired`, `payment_failed`, `venue_cancelled`, `rescheduled`

A booking may contain one or more consecutive/non-consecutive hourly slots on the same court/date where the business rules allow it.

Every booking stores a monetary snapshot. Historical bookings must never change if administrators later edit a pricing rule.

### Slot locking

Before payment, selected slots require a short-lived lock. PostgreSQL remains the source of truth. Redis will hold temporary locks with expiry to prevent two customers from paying for the same court/time.

The backend must revalidate availability immediately before confirming payment.

### Payments and refunds

Payment architecture is provider-neutral until SBP selects the payment gateway.

Store:

- payment attempt
- provider/reference IDs
- amount/currency
- status
- raw provider metadata where appropriate
- refund records
- wallet credit when enabled

No UI should assume card payment is the only method.

### Booking, cancellation and refund policy

Policies are versioned records. A booking records exactly which policy version the player accepted and the acceptance timestamp.

The Review Booking screen must receive the active policy from the backend and block payment unless the current policy has been accepted.

### Notifications

Events include booking confirmation, reminders, cancellation, refund progress, rescheduling, venue closure and announcements.

Notification delivery channels can later include in-app, push, SMS and email.

## Initial API boundary

Base prefix: `/api/v1`

### Public/player

- `GET /venues`
- `GET /venues/{venue_id}`
- `GET /venues/{venue_id}/courts`
- `GET /venues/{venue_id}/availability?date=YYYY-MM-DD`
- `GET /policies/active`
- `POST /bookings/quote`
- `POST /bookings`
- `GET /bookings/me`
- `GET /bookings/{booking_id}`
- `POST /bookings/{booking_id}/cancel`
- `POST /bookings/{booking_id}/reschedule`
- `POST /payments/...` (provider selected later)
- `GET /notifications/me`

### Administration/operations

- venue CRUD
- court CRUD
- pricing-rule CRUD
- closures/maintenance blocks
- booking search and booking actions
- refund management
- reports/reconciliation
- policy publishing
- user/role management

## Data integrity rules

1. Confirmed booking slots may not overlap on the same court.
2. Slot price is stored on the booking-slot row as a snapshot.
3. Booking totals are calculated server-side only.
4. Policy acceptance is recorded server-side before payment/confirmation.
5. Cancellation/refund eligibility is calculated from the policy and booking state, not from the client.
6. Administrative changes are auditable.
7. Venue time is interpreted in `Asia/Karachi` unless a future venue explicitly defines another timezone.

## Development phases

### Phase 1 — foundation

- FastAPI application
- database schema
- configuration
- health endpoint
- venue/court read APIs
- availability/pricing calculation
- seed Nishtar Park venue

### Phase 2 — identity and booking engine

- authentication
- booking quote
- slot locks
- confirmed bookings
- policy acceptance
- My Bookings APIs

### Phase 3 — payments/refunds

- selected provider integration
- callbacks/webhooks
- refund workflow
- reconciliation

### Phase 4 — administration and venue operations

- Next.js admin portal
- venue operator dashboard
- pricing/closure management
- booking and finance reporting

### Phase 5 — Android production client

- Compose implementation based on approved prototype
- real API integration
- push notifications
- release hardening
