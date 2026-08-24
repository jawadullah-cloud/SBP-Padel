# Player Password Recovery

SBP-Padel player password recovery uses a six-digit OTP delivered to the email address registered on the player account.

## Password policy

New and reset passwords must contain all of the following:

- at least 8 characters
- one lowercase letter
- one uppercase letter
- one number
- one special character

The player UI shows these requirements live and marks each requirement as it is satisfied. The backend enforces the same rules.

## Recovery flow

1. Player taps **Forgot password?** on the sign-in screen.
2. Player enters the registered email address.
3. `POST /api/v1/auth/forgot-password` creates a six-digit OTP and a signed recovery challenge valid for 10 minutes.
4. The OTP is sent by SMTP.
5. Player enters the OTP and a new password.
6. `POST /api/v1/auth/reset-password` validates the OTP, challenge, expiry, password policy, account email and current password fingerprint.
7. After a successful reset, the original recovery challenge cannot be reused because the password fingerprint has changed.

The forgot-password response does not reveal whether an email address is registered.

## SMTP configuration

Configure `backend/.env`:

```env
PASSWORD_RESET_MINUTES=10
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=youraccount@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM_EMAIL=youraccount@gmail.com
SMTP_STARTTLS=true
```

For Gmail, enable 2-Step Verification on the Google account and create an **App Password**. Do not use the normal Google account password as `SMTP_PASSWORD`.

Other SMTP providers can be used by changing the host, port and credentials. The recovery API and player UI do not depend on Gmail specifically.

## Development fallback

If SMTP is not configured and `ENVIRONMENT=development`, the backend logs the recovery email (including the OTP) to the backend console. This keeps local development testable without pretending that an email was actually delivered.
