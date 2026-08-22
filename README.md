# SBP-Padel

Sports Board Punjab Padel Courts digital platform.

This repository is intended to hold the complete SBP Padel product as it develops, including the Android app, booking/backend services, administration portal, public website, and the interactive UI design prototype.

## Current structure

- `docs/` — live interactive UI prototype used for design review and GitHub Pages preview
- `android/` — planned Kotlin + Jetpack Compose Android application
- `backend/` — planned booking API and platform services
- `admin/` — planned court administration portal
- `website/` — planned public website

## UI prototype

The current prototype includes:

- premium dark theme
- matching light theme
- Home screen
- Venue Details screen
- booking/date/time selection
- animated screen transitions
- interactive navigation

The prototype is intentionally functionality-light. It is the visual source of truth while the UI is refined before production Android implementation.

## Planned production stack

- Android: Kotlin + Jetpack Compose
- Backend: FastAPI + PostgreSQL
- Caching / booking locks: Redis
- Admin and public website: Next.js + TypeScript

