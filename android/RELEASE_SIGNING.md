# Android signing policy

SBP-Padel keeps development/debug signing and production release signing strictly separate.

## Debug builds

The repository contains `android/dev-signing-key.b64`, a deliberately public, disposable **development-only** signing fixture. It exists so debug APKs produced on different machines and by GitHub Actions share one stable development identity and can install as upgrades over earlier test APKs without forcing testers to uninstall the app.

The fixture is not a production secret and must never be reused for public release signing.

## Release builds

Production release signing must use an SBP-controlled keystore stored outside Git and supplied through the eventual secure release environment. Release keystore files, aliases and passwords must never be committed to the repository.

The repository intentionally contains no production release signing configuration. When the production distribution channel is selected, release signing should be wired through protected CI/release secrets or the chosen store-managed signing mechanism.

## Rules

- Never reuse the public debug fixture for production.
- Never commit a production `.jks`, `.keystore`, base64 key blob or signing password.
- Keep the final release key under SBP/departmental custody.
- Back up the release key and recovery material using the department's approved secret-management process.
- Treat a signing-key change after public release as a controlled release-management event.
