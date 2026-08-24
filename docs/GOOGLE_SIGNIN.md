# Google Sign-In setup

SBP-Padel supports Google sign-in for player accounts in both the browser player and Android APK.

## Account behavior

- Google must return a verified email address.
- If that email already belongs to an SBP-Padel player, Google signs into the same account.
- If the email is new, one player account is created automatically.
- Google sign-in cannot be used to enter admin, venue-manager or venue-operator accounts.
- The backend verifies the Google ID token audience against `GOOGLE_CLIENT_ID` before issuing an SBP-Padel access token.

## Google Cloud configuration

Create one Google Cloud project for SBP-Padel and configure the OAuth consent screen.

### 1. Web OAuth client

Create an OAuth 2.0 Client ID of type **Web application**.

For local browser testing add these authorized JavaScript origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Copy the resulting Web Client ID into the local backend file:

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

The client ID is public configuration; the client secret is not required by this sign-in design and must not be added to the player JavaScript or Android app.

### 2. Android OAuth client

Create an OAuth 2.0 Client ID of type **Android** in the same Google Cloud project.

Use package name:

```text
pk.gov.punjab.sbp.padel
```

For the current stable development APK, obtain the SHA-1 from the repository development keystore after pulling:

```powershell
keytool -list -v -keystore android\dev-signing.keystore -alias sbppadeldev -storepass sbppadeldev -keypass sbppadeldev | Select-String "SHA1"
```

Enter that SHA-1 when creating the Android OAuth client.

The Android app still requests its ID token for the **Web Client ID** stored in `GOOGLE_CLIENT_ID`. The separate Android client registers the package/signing-certificate identity with the same Google Cloud project.

## Runtime

Restart the backend after changing `.env`:

```powershell
.\run_backend_lan.ps1
```

Restart the player LAN server after pulling player JavaScript changes:

```powershell
.\run_player_lan.ps1
```

Native Google sign-in requires Android APK `0.6-debug` or later because Google authentication is intentionally handled outside WebView using Google Play Services.

## Production

Before release, create a production Android OAuth client using the final release package/signing certificate SHA-1 (and SHA-256 where requested by Google). Do not reuse the development signing identity for the production APK/AAB.
