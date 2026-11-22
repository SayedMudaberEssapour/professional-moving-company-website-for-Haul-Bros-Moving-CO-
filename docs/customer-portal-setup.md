# Customer portal — phone and private access code

## Current implementation (November 22, 2026)

Customers no longer need Google or SMS. Public quote forms and the Moving Calculator create a private profile, open it automatically in a new tab, and display a unique 128-bit random access code. Returning customers enter their phone number and code at `/customer-portal/`. Save the code; it is not sent through Formspree or placed in a URL. Codes are credentials, not proof that a customer owns a phone number.

The owner signs in with Google as `relocating@haulbrosmoving.com`. A button at the bottom of the homepage links to owner login. Only this verified owner can list all profiles and edit records. Customer access remains read-only. Earlier email/Formspree leads are not imported automatically. Existing Google-linked test records remain visible to the owner.

## Database and deployment

Project: `pslyefpxaeqwggsxnbnl`. Apply migrations 001–003 only to fresh projects; they are already deployed. Migration `202611220004_customer_access_codes.sql` adds guest records and private hashed access codes. It preserves existing records and owner-only update policies. Do not rerun the fresh-project SQL bundle on production.

Anonymous clients cannot read or update `customer_moves` directly. The limited creation RPC ignores submitted prices, deposits, status and customer IDs. The read RPC requires the exact phone and cryptographically random code. Only hashes are stored in `private.move_access`; that table is inaccessible to public roles. Code collisions are rejected by a unique constraint. Each request has a distinct code; retries in the same page reuse it and are idempotent. Submission limit: five per phone per day.

Auth sessions and customer access credentials remain in memory. A one-use capability restricted to the exact same-origin window transfers access to the new profile tab. Direct visits require login. Closing/reloading the tab ends its session. Customer codes are shown in the profile and original submission page for saving; they are never query parameters or notification payloads.

Supabase production Site URL is `https://www.haulbrosmoving.com`; OAuth callback is `/customer-portal/auth-callback.html`. Google owner sign-in is configured and has passed a real user test. Google basic identity scopes are exempt from Testing audience allowlisting. Keep provider secrets in Supabase. No SMTP or SMS provider is needed.

## Validation

`NODE_PATH=/tmp/haulbros-portal-tests/node_modules node tests/portal-security.cjs` executes all migrations with simulated identities: anonymous denial, code/phone pairing, hashed code privacy, guest read-only access, owner editing, idempotency, verified owner registration and price-forgery protection.

`node tests/portal-browser.cjs` uses fictional records and mocked network services: owner Google PKCE, returning phone/code login, incorrect code rejection, homepage quotes, calculator submissions, new-tab handoff, responsive layout and notification behavior. No real emails are sent by these tests.

The portal records agreed pricing and deposit amounts; it does not process payments. Inventory/estimates remain pending on simple quote forms. The owner adds confirmed amounts and instructions after review.

Migration `202611220005_restore_business_owner.sql` revokes the previous Gmail owner and registers only the verified business email, immediately if already present or on its next verified sign-in. Customer records are preserved.

## Itemized hourly estimates

Migration `202611220006_itemized_estimates.sql` adds owner-only `estimate_details`: crew/truck counts, estimated hours, hourly rate, optional first-hours package, and quantity/unit-price service lines. Existing fixed-price values are retained in the database for history but no longer shown or edited. The display and editor calculate an estimated range, add service lines, and subtract the deposit received to show estimated balance. Unpriced items keep the total incomplete. Calculator-derived local crew defaults match the existing calculator packages; custom/long-distance moves require owner-entered rates. Guest creation ignores submitted `estimate_details`; only the owner can save it.

`node tests/estimate-pricing.cjs` checks package minimums, hourly-only estimates, fractional hours, material/storage quantities and missing/zero prices.

## Owner room drafts and lost access codes

The inventory editor uses room and item presets matching the Moving Calculator, plus additional bedrooms, kitchens, other areas and custom items. Its values remain in the owner tab until Save Changes. Cancel discards them; the customer reads only the last database snapshot. Owner estimates remain independently editable.

Migration `202611220007_owner_code_replacement.sql` adds an owner-only, stale-record-protected code replacement RPC. Existing hashed codes cannot be retrieved. The owner can generate/copy a replacement to share privately; it invalidates the previous code and uses the customer’s saved phone number. The replacement plaintext is shown once and never stored or logged. Existing Google-created profiles can also receive phone/code access through this action. Owner edits are audited.
