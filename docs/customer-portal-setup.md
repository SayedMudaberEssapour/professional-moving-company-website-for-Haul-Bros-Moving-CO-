# Private move portal setup

The portal is built locally and the supplied project URL/public key have been verified, but it stays disabled until the database and email delivery are configured and tested.

Project: `pslyefpxaeqwggsxnbnl`. The live project currently has email signup enabled and email verification required; the portal tables/functions were not present when checked. The supplied key is a public browser key, not administrative SQL access. The live calculator continues to use its existing Formspree workflow. Do not enable the portal merely by changing the feature flag: first deploy the database, configure email delivery, register the owner, and test access using separate accounts.

## Customer and owner behavior

A customer uses the calculator, verifies their email with a one-time code, and submits their inventory. The database creates an immutable customer submission identified by that authenticated user. The website sends the existing Formspree notification after the private record is saved. If notification fails, the record remains available to the owner and the customer sees an accurate saved-record message.

The customer can sign in at `/customer-portal/` to read their own records. Only the verified account **relocating@haulbrosmoving.com** will be bootstrapped as the owner. That owner can view all moves and update contact details, inventory, status, confirmed price, deposit requested, deposit received, deposit instructions, moving-day instructions, and customer-visible updates. Private audit records log edits. The portal records amounts; it does not process card payments or automatically confirm receipt of deposits.

Quoted prices and deposit amounts start unconfirmed. The customer's calculator output remains labeled as an original planning estimate. No price, payment receipt, or booking is confirmed automatically. Owner inventory edits do not silently recalculate the submitted planning estimate.

## Connect and deploy

1. Install/connect the Supabase integration in this chat and sign in to the account that owns the project. Select or create the project for Haul Bros. Do not paste database passwords or service-role keys into chat or website source.
2. Run `supabase/setup-customer-portal.sql` once in the project SQL editor, or apply both files in `supabase/migrations/` in order. It creates `public.customer_moves`, the submission RPC, database row-level security policies, and private owner/audit tables. Migration assumes a fresh project without these objects.
3. Enable email sign-in and verified email signup. Configure a production email provider/custom SMTP for sending customer codes. Supabase's default mail service is limited and should not be relied on to send codes to arbitrary customers. Set the email template to include `{{ .Token }}` rather than require a magic link. Choose a short OTP expiry and appropriate Auth rate limits. Configure signup/email CAPTCHA if needed; wire the matching client CAPTCHA before requiring it. This implementation uses email codes, not URL tokens.
4. In the local `assets/customer-portal-config.js`, set the project URL and **publishable/anon client key**, then enable the feature for a local/staging verification. Never use a secret or service-role key. The URL must be the HTTPS `PROJECT.supabase.co` URL. Neither the owner email nor any privileged role is used for authorization in the browser.
5. Sign in at the local portal as `relocating@haulbrosmoving.com`, The second migration automatically registers this exact account as the sole owner after its email is verified. If necessary, `supabase/bootstrap-owner.sql` is an idempotent manual check; it refuses to replace a different owner. Do not automatically grant ownership by matching editable customer metadata.
6. Test with two separate customer accounts and the owner through the real Supabase API. Confirm that each customer sees only their own records, cannot PATCH any record (including their own), and cannot create records directly through the table API. Confirm that only the owner can update records. Confirm owner updates appear when the customer signs in again.
7. Submit one labeled test move, verify the email code arrives, confirm the database record, verify the existing Formspree notification reaches Haul Bros, and check the customer view. Delete test users/records only through an explicit administrative cleanup plan; customers have no DELETE access.
8. Configure project backups, access protection for the Supabase account, and operational monitoring. Publish only after the real checks pass. Until then, leave the checked-in configuration disabled and empty.

## Security boundaries

- Authentication uses Supabase Auth and database policies use `auth.uid()`.
- Customer IDs come from the verified server session, never a posted customer ID or an email supplied by the client.
- Creation goes through a restricted function. Client-supplied pricing/deposit/status fields are ignored, and the verified email overrides any submitted email.
- Customers have SELECT access only to their own records, no direct INSERT, and no UPDATE or DELETE policy. A request to update a forbidden row returns no updated records.
- The single owner is registered in a non-public table that customers cannot read or change. Identity/ownership columns cannot be changed even by the portal owner.
- Edits use an `updated_at` precondition so stale owner tabs cannot silently overwrite newer changes.
- Auth tokens live only in tab memory. Closing/reloading the portal requires email sign-in again. The calculator's optional existing “Save on this device” feature saves a local draft; it does not grant private portal access.
- Private pages have no analytics scripts and use `noindex`, but database access controls—not hidden URLs or robots tags—provide privacy.
- No live credentials or customer records are stored in the repository. Never put service-role keys in public configuration.
- The owner can inspect audit records through the administrative database console. Customers cannot query them.

## Local checks

Install the temporary PostgreSQL test runtime without adding dependencies to the website:

```sh
npm install --prefix /tmp/haulbros-portal-tests @electric-sql/pglite@0.3.14 --ignore-scripts --no-audit --no-fund
NODE_PATH=/tmp/haulbros-portal-tests/node_modules node tests/portal-security.cjs
```

The security test executes the actual migration in PostgreSQL with simulated Supabase identities. It checks anonymous denial, email verification, cross-customer isolation, edit restrictions, immutable ownership, forged pricing, audit privacy, idempotency and submission limits. This does not substitute for real hosted API checks.

For the browser test, run a local HTTP server from the repository. Set `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and `PORTAL_TEST_URL` if needed, then run:

```sh
node tests/portal-browser.cjs
```

The browser test injects enabled test configuration and mocks Supabase/Auth/Formspree. It exercises verification, customer and owner views, editing, stale-save handling, responsive layouts and calculator integration. Sample data is fictional and no emails are sent. The production configuration stays disabled.

## Provider documentation

- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Production email configuration](https://supabase.com/docs/guides/auth/auth-smtp)
