# Security Policy

SBP-Padel handles player accounts, bookings, payments, venue operations and administrative workflows. Security issues should be handled privately until a fix is available.

## Reporting a vulnerability

Do not open a public GitHub issue containing exploit details, credentials, tokens, personal data or steps that could be used to compromise a deployment.

Report security concerns directly to the repository owner/maintainer through a private channel. Include:

- the affected component and version/commit if known;
- a concise description of the impact;
- reproducible steps or proof of concept where safe;
- any suggested mitigation.

## Supported code

The active development line is `backend-v1-dev`. `main` is the release branch and may lag active development until a release is accepted.

Security fixes should be implemented and tested on the active development line, then included in the next accepted release. Never commit production secrets, signing keys, database credentials or real user data to the repository.
