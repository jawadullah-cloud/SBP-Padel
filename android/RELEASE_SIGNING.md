# Android release signing

The repository's `dev-signing-key.b64` and `devStable` Gradle signing config are **development-only**. They exist so debug APK upgrades keep the same test identity across CI builds. They are not a production credential and must never be used to sign a release artifact.

## Current invariant

- CI builds `:app:assembleDebug` only.
- `debug` uses the disposable `devStable` identity.
- `release` has no repository signing configuration.
- Real `.keystore`, `.jks`, `.p12` and `key.properties` files are ignored by Git.

## Before public release

1. Create the final SBP-controlled Android signing key outside this repository.
2. Store the key and passwords in the chosen CI/deployment secret store.
3. Add an explicit release signing configuration that reads secrets at build time only.
4. Set final release `versionCode` / `versionName` and distribution channel.
5. Build a release APK/AAB in CI and verify its certificate fingerprint.
6. If Google sign-in is later enabled, register the **release** signing SHA-1/SHA-256 with the production OAuth client. The development fingerprint is not a substitute.
7. Archive the signing key under SBP operational custody with recovery/rotation procedures.

Do not add a release signing key to source control, even temporarily.
