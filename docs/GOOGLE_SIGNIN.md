# Google Sign-In — deferred integration notes

Google sign-in is **not currently an active player-facing feature** in SBP-Padel. The player login screen must not show a **Continue with Google** option until the complete browser/Android OAuth configuration is intentionally enabled, tested and manually accepted.

The backend contains Google-token verification scaffolding and automated tests so the integration can be completed later without redesigning account identity. That backend capability does not mean the feature is enabled in the current product UI.

## Intended account behavior when enabled later

- Google must return a verified email address.
- If that email already belongs to an SBP-Padel player, Google should sign into the same account.
- If the email is new, one player account may be created automatically.
- Google sign-in must never grant admin, venue-manager or venue-operator access.
- The backend verifies the Google ID token audience against `GOOGLE_CLIENT_ID` before issuing an SBP-Padel access token.

## Configuration required before enabling

Create one Google Cloud project for SBP-Padel and configure the OAuth consent screen.

### Web OAuth client

Create an OAuth 2.0 Client ID of type **Web application**. For local browser testing, authorized JavaScript origins would include:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

The resulting Web Client ID belongs in backend configuration as `GOOGLE_CLIENT_ID`. The client ID is public configuration; a client secret must not be placed in player JavaScript or the Android app.

### Android OAuth client

Create an OAuth 2.0 Client ID of type **Android** in the same Google Cloud project using package name:

```text
pk.gov.punjab.sbp.padel
```

Register the signing-certificate identity for the APK/AAB being tested or released. Production must use the final release signing certificate rather than a development signing identity.

## Re-enablement gate

Do not restore the Google login button merely because backend code exists. Re-enable it only after all of the following are true:

1. Google Cloud OAuth consent and client configuration are complete.
2. Browser and native Android sign-in both exchange a verified Google ID token successfully.
3. Existing-player account linking and new-player creation are covered by backend QA.
4. Staff/admin accounts are proven inaccessible through Google player login.
5. Android/WebView lifecycle and cancellation/error states are tested.
6. The user manually accepts the visible Google sign-in flow.

Until that gate is completed, email/mobile + password and password recovery remain the active player authentication methods.
