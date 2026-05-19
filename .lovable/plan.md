## Diagnosis

Signup is hitting `POST /auth/v1/signup` and returning **422 `weak_password`** — the password `Test123!` is in the HIBP breached-password list. Your project has leaked-password protection enabled, so Supabase rejects it. The request itself works fine; the UX just hides the reason.

```
{"code":"weak_password","message":"Password is known to be weak and easy to guess, please choose a different one.","weak_password":{"reasons":["pwned"]}}
```

Today the login screen only shows a `toast.error(...)`, which is easy to miss on a 622px-wide viewport, and the placeholder still says "Password (min 6 chars)" — no hint that the password also has to not be in a known breach.

## Fix

Two small, focused changes — no DB/auth-config changes:

1. **`src/routes/login.tsx`** — surface the real error inline:
   - Add an `error` state and render it as a red inline banner inside the form card, above the CTA button (so it can't be missed when the toast is off-screen).
   - In `submit()`, map known Supabase auth error codes to human copy:
     - `weak_password` → "That password has shown up in a known data breach. Pick a longer or more unique one."
     - `user_already_exists` / `email_exists` → "An account with this email already exists. Try signing in."
     - `invalid_credentials` → "That email and password don't match."
     - `email_not_confirmed` → "Confirm your email first — check your inbox for the link."
     - Otherwise fall back to `error.message`.
   - Keep the toast as a secondary signal.
2. **Password field guidance** — update the placeholder/helper to:
   - Placeholder: `Password (8+ chars, not a common one)`
   - Under the field, in signup mode only, add a one-line helper: `Avoid passwords you've used elsewhere — we block ones found in known breaches.`
   - Client-side, when in `signup` mode, disable the button until `password.length >= 8`.

That's it. Leaked-password protection is a good default — don't turn it off.

## Out of scope

- Disabling HIBP. Keep it on for security.
- Password-strength meter / zxcvbn — out of scope for this fix.
- Changes to Google/OAuth, email confirmation, or any DB schema.