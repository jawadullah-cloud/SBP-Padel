# SBP-Padel native Android migration

Last verified: 4 September 2026.

## Decision

The earlier Android `1.0.0-rc1` build is a hardened WebView staging shell only. It is retained as historical connectivity/UAT evidence and must not be treated as the product UI candidate.

The Android client is now migrating to a genuine native Jetpack Compose application that talks directly to the SBP-Padel backend API over HTTPS. The legacy WebView `MainActivity.java` has been removed from the active Android client.

## First native release-candidate preview

Native Android workflow run `33852341052` on head `4a9f8a8bffa350b51b08c206d4f15904cbd56141` completed **success**.

Produced artifact:

- name: `sbp-padel-1.0.0-rc2-native-apk`
- artifact id: `9928953690`
- digest: `sha256:bc03f99bce734d892d13837222d1b50fb50d95803709ec45047dc37f8fa9d3e9`
- versionCode: `14`
- versionName: `1.0.0-rc2`
- target: `https://sbp-padel-api-staging.vercel.app/api/v1`

The workflow verified the canonical HTTPS staging API, built both native debug and minified release-candidate variants, verified the RC packaged manifest does not permit cleartext traffic, and uploaded the native APK artifacts. Security CI run `33852341042` for the same head also passed its complete Git-history secret scan.

## Native surface currently implemented

The first native preview provides:

- Jetpack Compose activity rather than a WebView;
- native sign-in and player registration against `/auth/login` and `/auth/register`;
- authenticated session validation through `/auth/me`;
- native Home, Courts, My Bookings and Profile bottom-navigation surfaces;
- hosted venue discovery from `/venues` and venue/court detail from `/venues/{id}`;
- authenticated booking-history retrieval from `/bookings/me`;
- dark and light app themes;
- new native launcher/app mark rather than the legacy JPG logo;
- HTTPS-only RC connectivity directly to the hosted staging API, with no local Player or backend server required.

## Important product status

`rc2` is the **first native product-preview milestone**, not feature parity with the mature web Player yet and not production release approval.

Still to port/refine natively before the Android client can replace the current Player surface completely:

- venue availability/date/slot selection and native quote/checkout;
- full booking detail, cancellation/reschedule and policy UX;
- QR/digital pass and check-in-facing player UX where applicable;
- notifications;
- profile editing/avatar flow;
- password recovery once SMTP staging is configured;
- Google sign-in if retained in the accepted product scope;
- native location/distance UX where retained;
- exact accepted SBP branding assets and final typography/design polish;
- secure token persistence backed by Android Keystore rather than the present preview persistence;
- real-device UI/accessibility/product QA across supported Android sizes.

Do not restore the WebView shell as the release candidate simply because it has wider legacy feature coverage. Port missing flows into the native client deliberately while keeping backend/API behavior authoritative.

## Staging data note

The hosted Neon staging database is independent of the historical local development database. It currently contains the controlled Nishtar Park staging reference data rather than every venue/court created locally during development. Native Android therefore correctly shows the hosted staging records. Data that should become part of shared UAT must be intentionally created/migrated into staging rather than copied implicitly from a developer workstation.

Production PayZen credentials, PITB production hosting, SBP production signing and final distribution remain separate external gates.
