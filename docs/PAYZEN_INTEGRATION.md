# PayZen integration preparation

Status: **confirmed integration direction, not yet production-integrated**.

SBP-Padel is being designed around PITB PayZen as a **PSID-first digital collection platform**. PSID is the primary external payment identifier and must be treated as a first-class payment object throughout Player checkout, backend payment state, finance/reconciliation and support tooling.

The real adapter must still wait for authoritative PITB technical documentation, credentials and UAT access. Do not invent private endpoints, signatures, authentication or payload fields.

## Confirmed operating model

PITB public material and the PayZen 2025 presentation establish that PayZen integrates with an existing Line of Business/billing system, generates/uses a PSID for a challan/bill/invoice, exposes that PSID through 1Bill/1LINK payment channels, and provides transaction reporting/reconciliation. Supported public channels include mobile/internet banking, ATMs, over-the-counter/cash channels, branchless/telco channels and card payments.

For SBP-Padel the intended business flow is therefore:

1. Player selects court/date/time and SBP-Padel creates a temporary booking hold.
2. SBP-Padel creates the payable bill through the PayZen integration.
3. PayZen issues/returns a PSID associated with the SBP-Padel booking/reference and amount.
4. SBP-Padel persists the PSID and prominently displays it to the player with Copy and payment instructions.
5. The player pays the PSID through a supported 1Bill/PayZen channel.
6. PayZen/1LINK performs bill inquiry/verification as required by the official contract.
7. SBP-Padel learns authoritative payment status through the official notification/callback and/or status-inquiry mechanism.
8. Only verified server-side paid state may confirm the booking.
9. PSID remains the primary reconciliation/support reference after payment.

A provider/browser redirect or success screen is never proof of payment.

## PSID is first-class

The current generic `provider_reference` field is compatible with PSID, but the PayZen adapter and UI should conceptually treat that value as the PSID, not as an incidental opaque reference.

Required invariants:

- one active payable booking/payment attempt must not accidentally generate multiple PSIDs through repeated taps/retries;
- PSID must be persisted against the booking/payment before it is shown to the player;
- PSID must remain visible in Player payment state and HQ finance/reconciliation/support views;
- payment status must reconcile against the expected PSID, booking/reference and amount;
- duplicate notifications/status responses must be idempotent;
- an expired booking hold must never be resurrected merely because its PSID was paid late.

## PayZen/1Bill inquiry boundary

The presentation explicitly describes PSID inquiry/verification in the 1Bill information flow and lists both **PayZen APIs** and **Client APIs** in integration activities. SBP-Padel must therefore be prepared for PayZen to require one or more client-side bill inquiry/validation APIs in addition to APIs that SBP-Padel calls.

Do not implement guessed endpoints yet. The eventual integration boundary should be capable of supporting these logical operations if confirmed by PITB:

- create/register bill and obtain PSID;
- validate/inquire a PSID and return authoritative bill details/status;
- receive authenticated payment notification;
- query payment/transaction status for recovery and reconciliation;
- expose or consume reconciliation data.

The exact direction, schemas and authentication of these calls remain an official PayZen contract question.

## Existing SBP-Padel provider boundary

`backend/app/payments/providers.py` owns the provider interface. `/api/v1/payments/initiate` calls that interface and persists provider name, provider reference/PSID, optional provider/client payload and provider metadata.

Repeated initiation for the same pending booking returns the existing pending payment instead of generating another provider bill/PSID. Backend regression coverage locks this behavior.

The provider abstraction also has a verified callback normalization boundary. A real PayZen adapter must map the official PayZen notification/status contract into the core state machine without allowing PayZen-specific details to leak into booking ownership rules.

## Payment state and booking safety

The core rules remain:

- pending payment leaves the booking held/pending;
- verified paid confirms only while the booking can still safely own its held inventory;
- duplicate paid notifications are idempotent;
- amount/reference mismatch is rejected rather than silently accepted;
- unknown/unverifiable provider events cannot change financial state;
- verified failed/expired payment releases a still-pending booking where applicable;
- browser return/success is never authoritative.

### Late PSID payment

A PSID can potentially be paid after the temporary court hold is no longer safe to honor. A verified late payment must therefore be recorded as money received but must **not** reclaim/resurrect a slot that may have been sold to another player.

Such cases enter a manual financial reconciliation/refund workflow. The booking remains unconfirmed/expired and any residual inventory lock is released.

## Refunds are manual

**PayZen does not provide SBP-Padel with an automated refund capability. Do not build or wait for a PayZen refund API.**

SBP-Padel's existing refund request/approval workflow remains useful as the internal governance and audit trail, but actual return of funds is an operational/manual process outside the PayZen API integration. HQ/finance should record the manual refund outcome/reference/evidence as appropriate.

This also applies to late-paid PSIDs that cannot safely result in a booking: they enter manual reconciliation/refund handling rather than provider-side automatic reversal.

## Player configured-provider runtime

`docs/payment-methods-live.js` is the provider-aware Player payment layer on `payment.html`.

Regression coverage proves:

- booking creation and participant persistence occur before provider initiation;
- `/payments/initiate` can return a configured provider and PSID/reference;
- PSID/reference is displayed with Copy UI;
- Check Status and polling read authoritative backend state;
- configured PayZen-style flow never calls the development `/simulate-success` endpoint;
- receiving a PSID/reference or provider redirect does not mark the booking confirmed;
- confirmation occurs only after verified backend paid + confirmed booking state;
- returning to payment for an already-confirmed booking does not create another booking or initiate another payment.

The development/unconfigured-provider simulator remains intentionally development-only until the real adapter is available.

## Expected Player experience

The default PayZen experience should be designed PSID-first:

1. booking/slot hold created;
2. amount shown;
3. PSID requested and persisted;
4. PSID displayed prominently with Copy;
5. concise instruction to pay through the supported PayZen/1Bill channels;
6. visible waiting/payment-pending state;
7. Check Payment Status plus safe automatic polling where appropriate;
8. confirmation only after authoritative backend verification;
9. clear handling for expiry, failed payment and paid-after-expiry/manual-reconciliation cases.

Card payment can be supported as an additional PayZen channel if the official integration pack exposes it, but the architecture must not assume card checkout is the primary payment object. PSID remains central.

## Technical information required from PITB / PayZen

Before implementing the production adapter obtain the official integration/onboarding pack and confirm:

### Connectivity and environments
- UAT/SIT and production base URLs;
- whether VPN/OTI tunnel is mandatory for each environment;
- source/destination IP whitelisting requirements;
- DNS/TLS/certificate requirements;
- PITB endpoints and any SBP-Padel endpoints that PITB must whitelist;
- network timeout/retry expectations.

### Credentials and authentication
- client/organization/merchant identifier;
- service/biller identifiers;
- authentication method;
- credential/token lifetime and rotation process;
- API signing, encryption or certificate requirements;
- separate UAT and production credentials;
- secure credential exchange process.

### PSID creation
- exact endpoint and HTTP method;
- exact request/response schema;
- which SBP-Padel reference must be supplied as challan/invoice/client reference;
- required customer fields and validation rules, including CNIC/mobile/email if required;
- amount representation/precision and PKR rules;
- service type/service ID mapping;
- due date/expiry requirements;
- PSID lifetime;
- whether an unpaid PSID can be cancelled/invalidated;
- idempotency behavior and how duplicate PSID creation is prevented;
- PSID format/length and whether it is safe to expose/store exactly as returned;
- error/status codes and retry rules.

### Client bill inquiry API
Confirm whether PayZen/1LINK calls SBP-Padel to inquire/validate a PSID. If yes, obtain:

- endpoint contract SBP-Padel must expose;
- request fields sent by PayZen/1LINK;
- required response fields and Y/N/status semantics;
- expected amount, payer, due/expiry and service data;
- authentication/signature/IP requirements for inbound inquiry;
- response timeout/SLA;
- retry behavior;
- behavior for expired, already-paid, cancelled or unknown PSIDs;
- whether inquiry must be available 24/7 and expected availability SLA.

### Payment notification / callback
- whether PayZen pushes real-time payment notification;
- callback/webhook request schema;
- authentication/signature/IP verification;
- transaction ID/reference fields;
- PSID field;
- amount and payment-channel fields;
- authoritative success/failure/pending status codes;
- duplicate/retry behavior and acknowledgement response;
- callback delivery SLA and retry schedule;
- whether notification can arrive before/after settlement.

### Payment status inquiry
- whether SBP-Padel can query a PSID/transaction directly;
- endpoint/request/response schema;
- authoritative status mapping;
- rate limits;
- recommended polling interval;
- transaction ID, bank/channel, payment timestamp and amount returned;
- behavior when a PSID is unknown, expired, unpaid or paid.

### Settlement and reconciliation
- settlement bank/account setup;
- settlement timing/cut-offs;
- whether gross amount or net-of-charges amount settles;
- who bears transaction/card/channel charges;
- reconciliation API/file/dashboard availability;
- report fields and download format;
- relationship among PSID, SBP booking/reference, PayZen transaction ID and bank transaction reference;
- settlement batch/reference identifiers;
- process for payment disputes, missing transactions, late payments and mismatches;
- PayZen dashboard access and user-role provisioning.

### Card channel, if SBP chooses to expose it
- whether card payment is automatically available against the same PSID;
- hosted page/redirect/deep-link contract;
- PCI scope for SBP-Padel;
- success/cancel/return URL behavior;
- authoritative server-side confirmation mechanism;
- card charges and settlement differences.

### Testing and go-live
- SIT/UAT test cases expected by PITB;
- test credentials and test PSIDs;
- sample successful, failed, expired and duplicate transactions;
- certification/sign-off requirements;
- production cutover procedure;
- support/escalation contacts and hours;
- monitoring/incident process.

## Information PayZen may require from SBP-Padel

Be ready to provide/confirm:

- organization: Sports Board Punjab / Youth Affairs & Sports Department as legally required;
- application/service name: SBP-Padel;
- purpose: online collection of padel court booking charges;
- Line of Business application ownership and technical contacts;
- UAT and production public URLs/domains;
- static outbound public IP(s), if PayZen whitelists SBP calls;
- inbound API URL(s), if PayZen requires client bill inquiry/notification endpoints;
- server/network architecture relevant to VPN/OTI/IP whitelisting;
- SSL/TLS certificates or certificate details where required;
- booking/client reference format;
- service types and service IDs to be mapped;
- expected transaction volume and peak TPS/concurrency;
- minimum/maximum/typical transaction amount;
- PSID desired validity relative to SBP-Padel's short booking hold;
- customer data available to send, subject to privacy requirements;
- designated settlement bank account and finance contacts;
- required PayZen dashboard users/roles;
- UAT test contacts and availability;
- production support/escalation contacts.

## Critical booking-hold question for PayZen

SBP-Padel sells scarce time-slot inventory. The team must specifically discuss the relationship between **PayZen PSID validity** and the much shorter **court booking hold**.

We need PayZen to clarify whether an unpaid PSID can be expired/cancelled immediately when our hold expires. If PayZen PSIDs remain payable for longer, SBP-Padel must continue to accept that a player may pay an old PSID after inventory has been released, record the payment, refuse to steal/reclaim the slot, and route the case to manual reconciliation/refund.

This is one of the most important integration questions for UAT.

## Next implementation step

Once the official PayZen technical material is received:

1. implement `PayZenPaymentProvider` behind the existing provider interface;
2. make PSID explicit in adapter/UI terminology while retaining generic provider storage where useful;
3. add required PayZen settings to environment templates and production preflight;
4. implement official PSID creation;
5. implement client bill inquiry endpoint if required;
6. implement authenticated notification and/or status inquiry exactly as specified;
7. map official statuses into the existing safe booking/payment state machine;
8. add reconciliation/dashboard support while keeping refunds manual;
9. add UAT contract/regression tests using official credentials and test PSIDs;
10. complete PITB SIT/UAT and production certification before activation.
