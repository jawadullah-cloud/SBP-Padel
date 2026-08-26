# PayZen integration preparation

Status: **confirmed PSID-first integration direction, not yet production-integrated**.

SBP-Padel is being designed around PITB PayZen as a PSID-first digital collection platform. PSID is the primary external payment and reconciliation identifier and must be treated as a first-class object throughout Player checkout, backend payment state, finance/reconciliation and support tooling.

The department has received PayZen/ZenFinity dashboard credentials and the applicable PayZen schedule of charges is part of SBP's signed contract. The real machine-to-machine adapter must still wait for authoritative PITB API documentation, API credentials and UAT access. Do not invent private endpoints, signatures, authentication or payload fields.

## Confirmed product model

The PayZen 2025 presentation distinguishes two related layers:

- **SBP-Padel** is our existing Line of Business (LOB) application and remains authoritative for courts, booking inventory, pricing, booking holds and booking status.
- **PayZen** is the digital collection/bill-aggregation layer. It integrates with existing billing/LOB systems, provides PSID-based collection through 1Bill/1LINK and other supported channels, and provides payment reporting/reconciliation.
- **ZenFinity** is PITB's SaaS digital invoicing/LOB application for organizations that need a ready-made billing/challan system. Its dashboard demonstrates payer, service, service-head, challan, expiry and PSID-generation workflows. SBP-Padel should not be replaced by ZenFinity for normal automated court bookings.

The desired integration is therefore the API/connector equivalent of the demonstrated manual ZenFinity workflow: SBP-Padel supplies the required booking/payment data, PayZen creates/registers the payable obligation and PSID, and SBP-Padel presents and tracks that PSID automatically.

## Confirmed PayZen information flow

The presentation shows that a client's LOB application issues a challan/bill/invoice with PSID. The payer uses the PSID through 1Bill. Transaction inquiry reaches 1LINK and is forwarded to PayZen, which verifies against the PSID and responds to 1LINK with Y/N status.

Therefore do **not** assume that PayZen calls SBP-Padel for every 1Bill inquiry. The presentation's integration plan lists both `PayZen APIs` and `Client APIs`, but the exact purpose and direction of the Client APIs must be confirmed from PITB's technical pack.

For SBP-Padel the intended flow is:

1. Player selects court/date/time and SBP-Padel creates a temporary booking hold.
2. SBP-Padel calculates the SBP challan/booking amount from authoritative booking pricing.
3. SBP-Padel calls the official PayZen integration to create/register a **one-time** payment obligation with the required payer/reference/service data and expiry.
4. PayZen generates/returns the PSID and applicable PayZen collection charge/total payable information according to the official API contract.
5. SBP-Padel persists the PSID before displaying it.
6. Player sees the PSID, SBP challan amount, PayZen collection charge and final payable amount as appropriate, plus Copy and payment instructions.
7. Player pays the PSID through a supported PayZen/1Bill channel.
8. SBP-Padel obtains authoritative payment state through the official PayZen notification and/or status-inquiry mechanism.
9. Only verified server-side paid state may confirm the booking.
10. PSID remains the primary reconciliation/support reference after payment.

A provider/browser redirect or success screen is never proof of payment.

## ZenFinity dashboard findings relevant to the API discussion

The supplied presentation shows the manual dashboard workflow and data model:

- Services and Service Heads can be configured.
- Payers can be created/imported with fields including Name, CNIC/B-Form, NTN, Mobile, Email, Reference No, Tag and Address.
- Challan creation supports a Service, Recurring Type, one or more Service Heads/fees, Total Fee, Fee After Due Date, Due Date, **Expiry Date**, Bank Title and Bank IBAN.
- The demonstrated recurring type includes **One-Time**, which is the normal model required for an SBP-Padel court booking.
- Challans can then be selected for **GET PSIDS**, after which PSID values appear in the challan listing.
- The generated challan includes PSID, payer/reference information, status, due date, expiry date, fee components and totals.
- The PayZen dashboard/reporting model exposes PSID and client-defined identifiers, challan/invoice/service information, bank, transaction amount, system transaction ID, date/time and challan amount.
- The presentation states that transaction amount is inclusive of charges and challan, while challan amount is separately visible.

The dashboard is useful for operations/manual exceptional cases and demonstrates the required concepts, but routine padel bookings require automatic API/connector generation rather than staff manually creating a payer/challan/PSID for every booking.

## PSID is first-class

The current generic `provider_reference` field is compatible with PSID, but the PayZen adapter and UI should conceptually treat that value as the PSID, not as an incidental opaque reference.

Required invariants:

- one active payable booking/payment attempt must not accidentally generate multiple PSIDs through repeated taps/retries;
- PSID must be persisted against the booking/payment before it is shown to the player;
- PSID must remain visible in Player payment state and HQ finance/reconciliation/support views;
- payment status must reconcile against the expected PSID, booking/reference and amount;
- duplicate notifications/status responses must be idempotent;
- an expired booking hold must never be resurrected merely because its PSID was paid late.

## Contracted PayZen charges applicable to SBP

The following schedule shown in the PayZen material is confirmed by the department as the schedule applicable to SBP under its signed contract.

### Collection via ADC channels / over the counter

| SBP challan / transaction slab (PKR) | Total PayZen fee (PKR) |
|---|---:|
| 0–10,000 | 18 |
| 10,001–50,000 | 25 |
| 50,001–100,000 | 36 |
| 100,001–250,000 | 69 |
| 250,001–1,000,000 | 138 |
| 1,000,001–2,500,000 | 275 |
| 2,500,001–5,000,000 | 413 |
| 5,000,000+ | 550 |

The presentation breaks these totals into 1LINK service charges plus PITB/revised PITB charges. Onboarding, annual maintenance, dashboard graphical representation and reporting are shown as free.

### Credit/debit card

The contracted presentation shows **2% of the transaction amount, inclusive of FED/taxes**, with no maximum stated in the table.

### Application rule

Do not silently hard-code a guessed final payable amount in the Player UI. The SBP booking/challan amount remains authoritative in SBP-Padel, while the PayZen adapter should use the official API response/contract to persist and expose the actual PayZen charge and final amount payable. The contracted schedule can be used for validation/reconciliation and, if PITB confirms client-side calculation is required, implemented centrally in the PayZen adapter rather than duplicated in UI code.

For a typical SBP-Padel challan within PKR 0–10,000, the contracted ADC/OTC PayZen fee is PKR 18. Example: a PKR 3,000 SBP challan would have a PKR 3,018 payable amount if the standard ADC/OTC fee is added to that challan. This example is explanatory; the production adapter must follow the official API's amount/charge semantics.

## PSID expiry and booking hold

The ZenFinity dashboard proves that **Expiry Date is an explicit challan field**. This is highly relevant to scarce court inventory.

The preferred SBP-Padel integration is to create each one-time PSID with an expiry synchronized as closely as PayZen permits to the booking-hold expiry. The technical meeting must confirm:

- whether the API accepts expiry dynamically per PSID/challan;
- whether expiry supports date+time or only date;
- timezone/format;
- minimum permitted lifetime/granularity;
- whether expiry can be changed/shortened after PSID generation;
- whether an expired PSID is guaranteed to become non-payable across all 1Bill/ADC channels and how quickly that state propagates.

Even with synchronized expiry, retain the late-payment safety rule because race conditions/network delays can occur: record verified money received, never reclaim a released slot, and route the case to manual reconciliation/refund.

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

## Refunds are manual

**PayZen does not support refunds for this SBP integration. Do not build or wait for a PayZen refund API.**

SBP-Padel's existing refund request/approval workflow remains the internal governance and audit trail. Actual return of funds is processed manually outside PayZen. HQ/finance should record the manual refund outcome/reference/evidence.

This also applies to late-paid PSIDs that cannot safely result in a booking.

## Expected Player experience

The default PayZen experience should be PSID-first:

1. booking/slot hold created;
2. SBP challan/booking amount shown;
3. one-time PayZen obligation created and PSID persisted;
4. PayZen collection charge and final payable amount shown from authoritative integration data;
5. PSID displayed prominently with Copy;
6. concise instruction to pay through supported PayZen/1Bill channels;
7. visible waiting/payment-pending state and expiry countdown where reliable;
8. Check Payment Status plus safe automatic polling where appropriate;
9. confirmation only after authoritative backend verification;
10. clear handling for expiry, failed payment and paid-after-expiry/manual-reconciliation cases.

Card payment can be supported as an additional PayZen channel if the official integration pack exposes it. PSID remains central.

## Technical information required from PITB / PayZen

The meeting should be framed as: **SBP already has its own LOB application and understands the ZenFinity manual workflow; provide the API/connector contract that lets SBP-Padel perform the equivalent one-time payer/challan/PSID process automatically.**

### API pack and environments
- complete PayZen integration/API specification for an existing LOB application;
- SIT/UAT and production base URLs;
- UAT credentials and production credential process;
- VPN/OTI tunnel requirements;
- source/destination IP whitelisting;
- DNS/TLS/certificate requirements;
- timeout/retry/rate-limit requirements.

### Authentication and identifiers
- organization/client identifier;
- service/biller identifiers;
- authentication/token/signing/encryption method;
- credential rotation;
- which client-defined reference should carry the SBP booking code/UUID.

### Payer model
- whether API PSID generation requires a persistent PayZen/ZenFinity payer to exist first;
- whether payer can be created through API;
- whether payer creation and challan creation can occur in one integration call;
- mandatory payer fields among Name, CNIC/B-Form, NTN, Mobile, Email, Reference, Tag and Address;
- whether SBP Player UUID/mobile can be the primary client-defined identifier without mandatory CNIC unless legally/technically required;
- duplicate payer rules and lookup keys.

### One-time challan / PSID generation
- exact endpoint(s), method(s), request and response schemas;
- API equivalent of ZenFinity `Create Challan` + `GET PSIDS`;
- whether PSID is returned synchronously or requires a second request;
- Service/Service Head mapping required for `Court Booking`;
- one-time recurring-type value;
- SBP challan amount fields and precision;
- due-date and expiry-date/time fields;
- bank/settlement fields supplied by client vs configured centrally;
- PSID format/length;
- idempotency key/duplicate prevention;
- ability to cancel/invalidate an unpaid PSID;
- error/status codes and retry rules.

### Charges and total payable
- confirm how the contracted slab fee is applied in API-generated PSIDs;
- exact API fields for challan/principal amount, PayZen/1LINK charges and total payable;
- whether PayZen calculates the contracted charge server-side or expects SBP to send it;
- whether ADC/OTC charge is always added to the payer amount for SBP;
- whether channel choice can alter the amount after PSID creation;
- card 2% handling and whether card uses the same PSID;
- rounding rules;
- what amount is settled to SBP and how charges appear in reconciliation.

### Expiry
- dynamic expiry per one-time PSID;
- date-only vs exact timestamp;
- timezone and minimum granularity;
- whether an expired PSID is rejected across all channels;
- propagation delay;
- ability to expire/cancel early if a booking hold is released.

### Client APIs
The presentation lists `Client APIs`, but do not assume their role. Ask PITB to identify every endpoint SBP-Padel must expose, its purpose, schema, authentication, availability/SLA and retry behavior.

### Payment notification and status inquiry
- exact authoritative mechanism: push notification, query API, or both;
- notification schema/authentication/signature/IP verification;
- PSID, transaction ID, bank/channel, paid amount and timestamp fields;
- official paid/pending/failed/expired/invalid statuses;
- duplicate/retry behavior and acknowledgement;
- status-query endpoint and recommended polling interval;
- behavior during PayZen/network outage and recovery.

### Dashboard and reconciliation
- whether API-generated SBP-Padel PSIDs appear in the same dashboard supplied to SBP;
- whether SBP booking reference is searchable/filterable;
- dashboard roles/users;
- reconciliation API/file/report fields;
- Excel/report export;
- PSID → SBP booking → PayZen transaction ID → bank/channel/reference traceability;
- settlement timing/cut-offs and gross/net treatment;
- operational handling of mismatches, late payments and manual refunds.

### Testing/go-live
- official SIT/UAT scenarios;
- test PSIDs and success/failure/expiry/duplicate cases;
- certification/sign-off;
- production cutover;
- support/escalation contacts and hours.

## Information PayZen may require from SBP-Padel

Be ready to provide:

- Sports Board Punjab / legally required contracting entity details;
- application/service name: SBP-Padel;
- purpose: automated collection of padel court booking charges;
- confirmation that SBP-Padel is the existing LOB/billing application;
- technical, finance, network and UAT focal persons;
- UAT/production domains and URLs;
- hosting/data-center details;
- static outbound public IPs;
- inbound endpoint URLs if Client APIs/notifications require them;
- VPN/OTI capability;
- SSL/TLS/certificate information;
- proposed service name (`Court Booking`) and service-head mapping if required;
- booking/reference format;
- payer/customer fields available;
- transaction volumes, peak TPS and amount ranges;
- desired short PSID expiry/booking-hold model;
- designated settlement bank account;
- dashboard users/roles;
- UAT availability and production support contacts.

## Proposed UAT invariants

At minimum prove:

1. one booking creates exactly one one-time PSID;
2. repeated Pay/retry does not create another PSID;
3. PSID carries the correct SBP booking reference and challan amount;
4. contracted PayZen charge and final payable are correct for each tested slab/channel;
5. dynamic expiry behaves as agreed;
6. successful 1Bill payment maps to the correct booking;
7. browser/client return never confirms payment by itself;
8. duplicate notification/status results are idempotent;
9. failed/expired unpaid booking releases its hold safely;
10. late payment cannot reclaim a released slot and is identifiable for manual reconciliation/refund;
11. network outage can recover by authoritative status inquiry without generating another PSID;
12. dashboard/reconciliation traces PSID to SBP booking, PayZen transaction and bank/channel data.

## Next implementation step

Once the official PayZen technical material is received:

1. implement `PayZenPaymentProvider` behind the existing provider interface;
2. make PSID explicit in adapter/UI terminology while retaining generic provider storage where useful;
3. add PayZen settings to environment templates and production preflight;
4. implement official payer/challan/PSID generation exactly as documented;
5. persist principal/challan amount, PayZen charge and final payable separately where the API supports them;
6. synchronize PSID expiry with booking hold as closely as the official API permits;
7. implement only the Client APIs PITB actually requires;
8. implement authenticated notification and/or status inquiry exactly as specified;
9. map official statuses into the existing safe booking/payment state machine;
10. integrate dashboard/reconciliation while keeping refund execution manual;
11. add UAT contract/regression tests using official credentials/test PSIDs;
12. complete PITB SIT/UAT and production certification before activation.
