# PayZen integration preparation

Status: **likely provider direction, not yet production-integrated**.

SBP/departmental discussions indicate PITB PayZen is the likely payment platform. The current application remains provider-neutral until the department receives the authoritative PayZen onboarding pack, credentials, service IDs, callback specification and production/sandbox endpoints.

## What is publicly established

Public PITB material describes PayZen as a government/public-sector payment collection platform and bill aggregator integrated with 1LINK and multiple acquiring/payment partners. PITB's August 2026 OCAS announcement confirms PayZen continues to be actively deployed and supports multiple payment channels including mobile banking, ATMs, debit/credit cards, TCS offices and branchless banking operators.

Public integration examples also describe a unique **PSID (Payment Slip Identifier)** for a transaction/challan and expose a PSID-generation shape using:

- client ID and client secret;
- authentication URL and PSID-generation URL;
- consumer name;
- CNIC;
- email;
- mobile number;
- challan/reference number;
- service ID;
- account number/title;
- due date and expiry date;
- amount within/after due date.

These public clues are useful for architecture only. They are **not** sufficient authority to implement the departmental production API contract.

## SBP-Padel integration boundary

The booking system treats PayZen as a payment provider rather than hard-coding PayZen details into booking logic.

`backend/app/payments/providers.py` owns the provider interface. `/api/v1/payments/initiate` calls that interface and persists:

- provider name;
- provider reference, expected to be the PSID or PayZen transaction identifier when implemented;
- redirect URL when a channel requires one;
- provider/client payload such as a PSID for display/copy;
- provider metadata needed for reconciliation.

Repeated initiation for the same pending booking returns the existing pending payment instead of generating another provider bill/PSID. Backend regression coverage locks this behavior.

## Verified callback boundary — prepared

The provider abstraction now also owns callback authentication/parsing through `verify_callback()`. A real PayZen adapter will verify the official signature/token/IP/authentication rules and normalize the provider payload into a `PaymentCallbackEvent` containing the provider reference, normalized status, amount/currency where supplied, transaction reference and reconciliation metadata.

The core callback route is deliberately provider-neutral and does **not** trust a browser return/success page. After provider verification it applies these rules:

- `pending` keeps the booking/payment pending and records provider callback metadata;
- verified `paid` confirms a booking only while it is still safely awaiting payment and its slot hold has not expired;
- duplicate verified `paid` callbacks are idempotent and cannot duplicate booking confirmation;
- a later contradictory `failed` callback cannot downgrade an already-paid/refunded transaction;
- verified `failed` releases a still-pending booking and moves it to payment-failed state;
- amount or currency mismatch is rejected rather than silently accepted;
- an unknown provider reference is rejected;
- an unauthenticated/unverifiable callback is rejected before any financial state changes.

### Late payment safety

A verified payment arriving after the booking hold has expired must never reclaim a slot that may have been sold to someone else. SBP-Padel therefore records the payment as received, leaves the booking unconfirmed/expired, releases any residual lock, opens exactly one refund/reconciliation request, and notifies the player that payment was received after the booking could no longer be confirmed.

This late-payment path is now covered by backend regression QA, including duplicate callback handling.

## Player configured-provider runtime — prepared and regression-locked

`docs/payment-methods-live.js` is the provider-aware Player payment layer on `payment.html`. It owns the Pay action through capture interception so the older `review-entry.js` development checkout handler cannot also process the same tap.

The configured-provider flow now has browser regression coverage proving the complete player-facing boundary without inventing PayZen behavior:

- booking creation still performs the established participant persistence request before provider initiation;
- `/payments/initiate` may return a configured provider name, provider reference/PSID, optional redirect URL and client payload;
- the provider reference/PSID is displayed with a Copy control;
- a Check Status control and automatic polling read authoritative backend payment and booking state;
- a configured provider (`requires_provider_integration: false`) never calls the development `/simulate-success` endpoint;
- receiving a provider reference or redirect URL does not mark the booking confirmed;
- confirmation occurs only after backend payment state is `paid` and booking state is confirmed/rescheduled/completed;
- returning to payment for an already-confirmed booking recovers that booking instead of creating another booking or initiating another payment.

The configured-provider browser regression originally failed before `/payments/initiate`. Runtime diagnostics proved `payment-methods-live.js` was loaded and active. The actual cause was a test/mock contract mismatch: `booking-participants-live.js` wraps successful booking creation and waits for `PUT /bookings/{booking_id}/participants`, but the new provider test had not mocked that established request. The test now includes the real participant-sync contract and also locks duplicate-booking recovery.

The development/unconfigured-provider simulator remains intentionally available only for development flow. Do not remove it until a real provider adapter is available, and do not permit it to run for a configured provider.

## Expected player experience

The exact screen should follow the confirmed PayZen contract, but the application is prepared for both of these patterns:

1. **PSID / 1Bill payment**
   - create booking and hold slots;
   - request PayZen bill/PSID;
   - display PSID with Copy and payment instructions;
   - optionally deep-link/redirect if PayZen supplies a hosted channel;
   - wait for authoritative provider confirmation/status inquiry;
   - confirm the booking only after verified server-side payment status.

2. **Hosted/card channel**
   - initiate through the same provider boundary;
   - open the returned provider URL/client flow;
   - rely on verified server-side confirmation, not the browser success page alone.

## Information required from PITB / PayZen before implementation

Obtain the official departmental onboarding/integration pack containing at least:

- sandbox/UAT and production base URLs;
- authentication scheme and token lifetime;
- SBP client/merchant ID and secret handling requirements;
- service ID(s) and account/biller identifiers;
- exact PSID-generation request and response schema;
- maximum/minimum booking amount and PKR formatting rules;
- due/expiry semantics and whether PSIDs can be cancelled/expired explicitly;
- payment-status inquiry endpoint;
- real-time callback/webhook specification;
- callback authentication/signature/IP allow-list requirements;
- transaction status codes and retry semantics;
- duplicate/idempotency rules;
- refund/reversal API availability and workflow;
- settlement/reconciliation file/API specification;
- card-channel/hosted-checkout flow if applicable;
- required customer fields, especially CNIC/mobile formatting;
- UAT credentials and test PSIDs;
- production go-live/certification checklist.

No production secret should be committed to Git.

## Confirmation and idempotency rules

The eventual PayZen adapter must obey these invariants:

- A client-side success/return page is not payment proof.
- Provider callbacks/status inquiry must be authenticated according to PayZen's official contract.
- Duplicate callbacks must be safe and idempotent.
- Amount, currency, booking reference and provider reference must be reconciled before confirmation.
- A payment received after a booking hold has expired must not silently steal a slot that may already have been rebooked. It must enter the existing explicit reconciliation/refund path.
- A verified failed payment must move a still-pending booking into the payment-failed path and release its held inventory.
- Payment and refund provider references must remain visible to HQ finance/reconciliation.
- A provider outage must not create duplicate bookings or duplicate PSIDs through repeated taps.

## Refunds

Current SBP-Padel cancellation creates an internal refund request and Manager/HQ workflows govern approval/status. Provider-side refund execution must only be wired once PayZen confirms whether refunds/reversals are API-driven or handled operationally through its dashboard/acquiring partner.

Until that contract is known, do not mark an internal refund `completed` merely because a provider call was attempted.

## Next PayZen implementation step

Once the official PayZen integration material is available:

1. implement a `PayZenPaymentProvider` behind the existing interface;
2. add PayZen settings to the environment template and production preflight;
3. map official PSID-generation and authenticated callback/status responses into the prepared provider events;
4. add sandbox contract tests using official UAT credentials/test PSIDs;
5. adapt the already-provider-aware Player payment presentation only where the official PSID/hosted-flow contract requires it;
6. add payment-status inquiry/reconciliation and provider-refund execution where supported;
7. complete UAT with PITB/PayZen before production activation.
