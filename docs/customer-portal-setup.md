# Private customer portal — Google sign-in

## Current status (November 22, 2026)

The database is deployed to Supabase project `pslyefpxaeqwggsxnbnl`. Three migrations are recorded as applied. Customer records have row-level security and owner-only editing. Anonymous REST access to records and creation is denied. The sole approved owner is now **sayedmusawer0797@gmail.com**, replacing relocating@haulbrosmoving.com.

The owner-account change is applied in the hosted database. The owner is registered only after Supabase verifies the approved account; entering its email into a public form never grants privileges. The former email no longer qualifies for ownership.

Google sign-in is implemented locally, but the Google provider is still disabled because its OAuth web client has not been configured. The public website remains on the existing Formspree calculator flow. `assets/customer-portal-config.js` stays disabled. Do not activate or publish the portal until the real Google sign-in test succeeds.

The Supabase Site URL is `https://www.haulbrosmoving.com`. The callback allowlist contains the production callback and a temporary local callback for testing. These two routing settings were applied without changing MFA, email confirmations, credentials or other services.

The earlier Gmail SMTP/email-code approach is retired. No Gmail app password or custom SMTP is needed for the Google-only sign-in flow. Existing Formspree email notifications remain in use for new move requests.

## One-time Google Cloud setup (account holder)

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) using the approved owner account and select or create a project for Haul Bros.
2. Configure branding: app name `Haul Bros Moving Co LLC`, support/developer email `sayedmusawer0797@gmail.com`, homepage `https://www.haulbrosmoving.com`, privacy page `/privacy-policy/`, and terms page `/terms-of-service/` on that domain. Select an **External** audience so customers outside the organization can sign in. Use only basic OpenID/profile/email scopes. Add the owner account as a test user while the app is in Testing. Move the audience to Production before opening sign-in to all customers, completing any Google requirements shown for the app.
3. In [Clients](https://console.cloud.google.com/auth/clients), create a **Web application** OAuth client. Use authorized JavaScript origin `https://www.haulbrosmoving.com`; for local testing add `http://127.0.0.1:8765` temporarily. Set this exact authorized redirect URI:
   `https://pslyefpxaeqwggsxnbnl.supabase.co/auth/v1/callback`
4. In the Supabase dashboard, Authentication → Sign In / Providers → Google, enable Google and enter the client ID and client secret directly there. Keep nonce checks enabled. Never put the Google client secret in Git, the website, or chat.
5. Tell the agent once the provider is saved. The public settings endpoint can confirm Google is enabled without exposing the secret.

## Finish activation (agent)

1. Do not rerun the initial SQL bundle on the existing project. `supabase/setup-customer-portal.sql` is only for a fresh project and now applies all three migrations atomically. The live migration history is already repaired through `202611220003`.
2. Confirm Google is enabled using `/auth/v1/settings`. Confirm the exact production callback is allowlisted. If reviewing remote config again, pull a fresh snapshot and inspect the diff; never push stale disabled provider settings over newly configured Google credentials.
3. Enable the feature locally and test a real Google sign-in with the approved Gmail account. The user completes Google authentication/consent. Confirm `private.portal_owner` contains only that verified account. Do not assume that being a Supabase project owner also creates a website Auth user.
4. Test one labeled move submission and check the database record, owner view, customer read-only behavior, pricing/deposit instructions, and existing Formspree notification. Customers must sign in with the Google account matching the email on their moving plan. Profiles are created only after authenticated submission, not merely on a button click or attempted sign-in.
5. Before launch, verify audience settings allow intended customers. Remove temporary local origins/callbacks when local testing is complete. Publish the tested website configuration and confirm the live page and callback files match.
6. Google sign-in must be tested against the real provider before deployment. Mocked tests cover protocol handling and permissions but cannot prove production Google consent/pop-up behavior.

## How the portal works

The calculator keeps the filled form in its original tab while a Google sign-in window opens. The callback uses PKCE; the verifier stays in memory, the one-time code is exchanged with Supabase, and no tokens or moving inventory are placed in browser storage. The callback removes the code from its URL immediately. Messages are accepted only from that exact popup and the website's own origin. Closing/reloading the tab ends the in-memory session.

After sign-in, the customer submits an authenticated inventory snapshot through `create_customer_move`. A request UUID makes retries idempotent. The server assigns the customer ID and verified email; client-supplied confirmed pricing, deposit receipts or booking status are ignored. The existing Formspree notification follows database creation. If notification fails, the saved record remains available and the customer sees an accurate saved-record message.

Customers can read their own records only. The owner can read all moves and update contact details, inventory, status, confirmed price, deposit requested/received, payment instructions and moving instructions. All customer-facing updates are visible to the corresponding customer. The original planning estimate is distinct from the confirmed quote. Owner edits do not silently recalculate it.

The portal records amounts; it does not process card payments or automatically verify receipt of money. Deposits and final quotes start unconfirmed. Audit records are private and visible through the administrative database console, not the customer portal. Owner edits use an `updated_at` precondition to reject stale overwrites. Immutable record ownership cannot be reassigned through the portal.

The private pages use `noindex` and no analytics scripts. Database access controls provide privacy; hidden URLs and robots tags do not. The calculator's existing optional “Save on this device” is separate from portal authentication and does not grant access.

## Tests

```sh
npm install --prefix /tmp/haulbros-portal-tests @electric-sql/pglite@0.3.14 --ignore-scripts --no-audit --no-fund
NODE_PATH=/tmp/haulbros-portal-tests/node_modules node tests/portal-security.cjs
node tests/portal-browser.cjs
```

Run a local HTTP server at port 8765 for browser tests. Override `PLAYWRIGHT_MODULE`, `CHROME_PATH`, or `PORTAL_TEST_URL` as needed. Tests use fictional data and mocked Google/Supabase/Formspree services; they send no emails.

Security tests execute the real SQL migrations with simulated identities and cover owner replacement, verified owner registration, customer isolation, owner-only editing, immutable ownership, forged prices, audit privacy, idempotency and daily submission limits. Browser tests cover Google PKCE challenge/code exchange, rejecting forged callback messages, email matching, customer read-only views, owner edits, stale-save handling, profile creation and responsive layout.

## References

- [Google sign-in setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
