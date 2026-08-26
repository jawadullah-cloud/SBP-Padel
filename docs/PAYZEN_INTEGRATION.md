# PayZen integration preparation

Status: **likely provider direction, not yet production-integrated**.

SBP/departmental discussions indicate PITB PayZen is the likely payment platform. The current application must remain provider-neutral until the department receives the authoritative PayZen onboarding pack, credentials, service IDs, callback specification and production/sandbox endpoints.

## What is publicly established

Public PITB/PayZen material describes PayZen as a government/public-sector payment collection platform centered on a unique **PSID (Payment Slip Identifier)** for each transaction/challan. The PSID can be paid through 1Bill/mobile or internet banking, ATMs, bank counters, branchless banking/retail channels and supported card channels. PayZen provides real-time payment intimation/reporting.

A public Laravel package maintained by a PITB developer exposes a PSID-generation shape using:

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

The booking system must treat PayZen as a payment provider rather than hard-code PayZen details into booking logic.

`backend/app/payments/providers.py` owns the provider interface. `/api/v1/payments/initiate` now calls that interface and persists:

- provider name;
- provider reference (expected to be the PSID or PayZen transaction identifier when implemented);
- redirect URL when a channel requires one;
- provider/client payload such as a PSID for display/copy;
- provider metadata needed for reconciliation.

Repeated initiation for the same pending booking must return the existing pending payment instead of generating another provider bill/PSID. Backend regression coverage locks this behavior.

## Expected player experience

The exact screen should follow the confirmed PayZen contract, but the application is prepared for both of these patterns:

1. **PSID / 1Bill payment**
   - create booking and hold slots;
   - request PayZen bill/PSID;
   - display PSID with Copy and payment instructions;
   - optionally deep-link/redirect if PayZen supplies a hosted channel;
   - wait for authoritative payment confirmation;
   - confirm the booking only after verified payment status.

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

The eventual implementation must obey these invariants:

- A client-side success/return page is not payment proof.
- Provider callbacks/status inquiry must be authenticated according to PayZen's official contract.
- Duplicate callbacks must be safe and idempotent.
- Amount, currency, booking reference and provider reference must be reconciled before confirmation.
- A payment received after a booking hold has expired must not silently steal a slot that may already have been rebooked. It must enter an explicit reconciliation/refund path.
- Payment and refund provider references must remain visible to HQ finance/reconciliation.
- A provider outage must not create duplicate bookings or duplicate PSIDs through repeated taps.

## Refunds

Current SBP-Padel cancellation creates an internal refund request and Manager/HQ workflows govern approval/status. Provider-side refund execution must only be wired once PayZen confirms whether refunds/reversals are API-driven or handled operationally through its dashboard/acquiring partner.

Until that contract is known, do not mark an internal refund `completed` merely because a provider call was attempted.

## Next PayZen implementation step

Once the official PayZen integration material is available:

1. implement a `PayZenPaymentProvider` behind the existing interface;
2. add PayZen settings to the environment template and production preflight;
3. add PSID/status/callback normalization with signed/verified callback handling;
4. add sandbox contract tests and duplicate-callback tests;
5. update player payment UI for the confirmed PSID/hosted flow;
6. add reconciliation and provider-refund execution where supported;
7. complete UAT with PITB/PayZen before production activation.
