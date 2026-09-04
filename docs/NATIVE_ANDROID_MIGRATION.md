# SBP-Padel native Android migration

Last verified: 4 September 2026.

## Decision

The earlier Android `1.0.0-rc1` build is a hardened WebView staging shell only. It is retained as historical connectivity/UAT evidence and must not be treated as the product UI candidate.

The Android client is migrating to a genuine native Jetpack Compose application that talks directly to the SBP-Padel backend API over HTTPS. The legacy WebView `MainActivity.java` has been removed from the active Android client.

## Design preservation lock — 4 September 2026

The first native `rc2` preview proved Android/Compose/API connectivity but introduced a simplified visual redesign. That visual direction was rejected and must not be used as the product baseline.

The accepted mature Player runtime remains the immutable product-design reference for the native port. Native screens must preserve the established experience from `docs/index.html`, `docs/styles.css`, `docs/home3.css`, `docs/bookings-module.css`, `docs/BOOKING_FLOW_V2.md` and `docs/REGRESSION_LOCKS_20260826.md`, including:

- dark-first premium SBP Padel visual identity with the matching accepted light theme;
- lime accent, deep green/ink surfaces and the `PLAY. PADEL.` hero language;
- established Home, Courts, Venue Detail, My Bookings and Profile information hierarchy;
- four-tab Home / Bookings / Courts / Profile navigation;
- Venue → Date → Court → Time → Review → Payment → Confirmation booking sequence;
- the existing five-stage booking progress treatment and server-authoritative pricing/policy behavior;
- Review must never create the booking; the pending-payment booking is created only at the final payment boundary after a refreshed quote;
- confirmation, digital pass/QR, booking detail, cancellation/reschedule and profile modules are to be ported without product redesign;
- previously accepted behavior remains protected by the existing regression locks.

A native implementation may replace HTML/CSS mechanics with Compose equivalents, but it must not silently simplify, restyle or remove an accepted product surface. Any deliberate visual redesign requires explicit manual approval before it can replace the locked design.

## Historical first native preview

Native Android workflow run `33852341052` on head `4a9f8a8bffa350b51b08c206d4f15904cbd56141` completed successfully and produced `sbp-padel-1.0.0-rc2-native-apk`. This artifact is retained only as historical native-connectivity evidence. It is not an accepted visual/product release candidate.

## Current native migration direction

The native client keeps the useful technical foundation from the first preview:

- Jetpack Compose activity rather than a WebView;
- direct HTTPS API connectivity;
- native sign-in and player registration;
- authenticated session validation;
- hosted venue/court and booking data;
- dark/light theme capability;
- minified secure RC builds with cleartext disabled.

The current migration is rebuilding those technical capabilities inside the locked Player design rather than designing a new UI.

Still to reach full native product parity:

- complete visual parity review for Home, venue discovery and venue detail;
- full locked booking flow including payment/provider handoff and confirmation;
- booking detail, cancellation/reschedule and refund-status UX;
- QR/digital pass;
- notifications;
- profile editing/avatar, Saved Players, Favourites and Help;
- native location/distance and Next Available parity;
- exact accepted branding assets and final typography review;
- Android Keystore-backed token persistence;
- real-device visual/accessibility QA across supported Android sizes.

## Staging data note

The hosted Neon staging database is independent of the historical local development database. It currently contains the controlled Nishtar Park staging reference data rather than every venue/court created locally during development. Data intended for shared UAT must be intentionally created or migrated into staging rather than copied implicitly from a developer workstation.

Production PayZen credentials, PITB production hosting, SBP production signing and final distribution remain separate external gates.
