# Player Booking Flow V2

## Purpose

The player booking journey is a single stateful flow across Venue → Date → Court → Time → Review → Payment → Confirmation.

## Single owner

`docs/review-entry.js` is the only owner of booking-flow state and booking-flow actions.

The service worker may load the flow owner on standalone checkout pages, but it must not inject older booking policy/pricing/state scripts.

## Persistent session

The active selection is stored in `localStorage` under `sbpPadelBookingSessionV2`.

The session owns:

- venue ID/name
- booking date
- court ID/name/type
- selected slot start times
- latest server quote
- active policy ID/content
- policy acceptance state
- selected payment method
- created booking/payment identifiers
- booking flow status

Going backward and forward in the flow must restore this state rather than reconstructing it from visible DOM.

## State invalidation

Changing an earlier choice invalidates only downstream state:

- changing Date clears Court, Time, Quote, Policy acceptance and Payment state
- changing Court clears Time, Quote, Policy acceptance and Payment state
- changing Time clears Quote, Policy acceptance and Payment state
- navigating backward without changing a choice does not clear it

## Booking creation invariant

A database booking must NOT be created from the Review screen.

Review only:

1. validates/refreshes the quote,
2. displays the active policy,
3. records policy acceptance in the local booking session,
4. moves to Payment.

Immediately before Pay & Confirm, the client requests a final quote. Only after that succeeds does it create the pending-payment booking and initiate payment.

This prevents the player's own pending booking hold from making the selected slot appear unavailable when they navigate back from Payment.

## Availability invariant

Saved selected slots are restored when returning to Time as long as the server still reports them available.

If another user or venue operation genuinely makes a saved slot unavailable, it is removed from the selection and the player is informed.

## Navigation invariant

The booking progress steps are interactive:

1. Venue
2. Date
3. Court
4. Time
5. Review

A player can navigate backward by clicking a completed step. Earlier selections remain stored unless the user changes them.

Standalone Review/Payment screens must use the application's deep router where available so transitions remain consistent with the rest of the player app.

## Regression guards

`backend/run_acceptance.ps1` must:

- syntax-check `review-entry.js`
- verify the persistent V2 session key remains present
- verify interactive step support remains present
- verify the service worker does not inject legacy review-policy/pricing/recovery scripts
- verify the payment-time booking creation invariant remains present
