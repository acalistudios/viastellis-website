# Shared-account billing safety

Updated 2026-09-10. ViaStellis and Shattered Saga remain in the same Stripe account.
Customers are created independently per authenticated app user, never by searching
for matching email addresses across the account.

## Enforcement

- Both apps stamp Checkout, Subscription and PaymentIntent metadata with their app
  and authenticated user ID. Server catalogs validate amount, currency, recurring
  interval and app tag; metadata credit amounts alone do not establish ownership.
- Explicit foreign tags are ignored. Shattered Saga requires its own tag.
  ViaStellis accepts untagged subscriptions only with an exact pre-existing local
  subscription binding, plus matching customer and approved catalog. Untagged
  Checkout Sessions do not receive this exception. There is no strict-mode toggle
  assigning all old objects to ViaStellis.
- Subscription state is stored per subscription/provider. Profile access is a
  projection of the remaining valid entitlements. Stripe events retrieve the
  current subscription from Stripe, not the stale status in an event payload.
- Event receipt, grant, entitlement and profile projection commit together.
  Failed writes roll back. A logical invoice/Checkout/Play transaction has its own
  grant identity, preventing duplicate grants from different event IDs.
- Only paid/no-payment-required Checkouts may fulfill; asynchronous success has a
  separate handler. Both endpoints subscribe to invoice.paid, checkout completion,
  asynchronous payment success and subscription update/deletion.
- Checkout locks and pending-session reuse prevent normal concurrent duplicate
  subscriptions. Existing nonterminal subscriptions must be managed first.
- Cancellation authenticates the user, validates the exact subscription,
  customer and approved prices, then cancels renewal at period end.
  The legacy smart-worker URL imports the same safe handler.
- Billing mutation RPCs are service-role-only. Credit refunds require a matching
  own usage-ledger debit and cannot be applied twice.
- RevenueCat fails closed without its webhook secret, checks environment and
  product namespace, and uses independent Play entitlements and transaction grants.

## Tests

From the repository root:

    npm ci
    node --test scripts/billing-database.test.mjs
    deno test --allow-env scripts/billing-handlers.test.ts supabase/functions/_shared/stripeApp_test.ts
    npm run build

PostgreSQL tests use real PL/pgSQL in isolated PGlite, including permission checks,
rollback after a grant, duplicate events, duplicate grant identities, stale
snapshots, independent Stripe/Play subscriptions, checkout locks and refunds.
Handler tests run the actual Edge Function entrypoints and Stripe SDK with
network fixtures. They do not simulate real card authorization or 3-D Secure.
The website deployment workflow gates publication on these billing tests.

Shattered Saga has equivalent D1/SQLite tests (Miniflare), including signed HTTP
routes: npm run test:billing in its api-worker directory. No production database
is used by either automated test suite.

## Deployment and recovery

The four 2026091021/22 migrations are applied and registered in production.
They preserve the existing manual Premium entitlement and the canceled legacy
Stripe subscription. Do not run db push over an unrelated dirty migration tree.
Deploy stripe-webhook, create-checkout-session, cancel-subscription, smart-worker
and revenuecat-webhook from the reviewed source. Webhooks verify provider
signatures/secrets; checkout/cancel verify the session using Supabase Auth.

The old grant/set_subscription RPCs remain for backend compatibility but are not
used by the new billing handlers. Never restore PUBLIC/anon/authenticated grants.
Only the 8-argument set_subscription signature remains; defaults cover older callers.
Do not roll back to customer-only matching or reintroduce global legacy ownership.
Do not delete event/grant ledgers to replay a payment: first identify the exact
missing effect and reconcile it with the original invoice or Checkout ID.

Production checks establish deployment, catalog scoping, endpoint event lists,
database restrictions and authentication rejection. They are not a completed
card purchase. Final payment-provider acceptance requires a controlled sandbox
purchase, renewal/recovery and cancellation flow. Do not use test cards in live
mode, change live keys to test keys, or charge an existing customer for testing.

This is a billing-scope review, not a guarantee covering every unrelated app
feature or development-tool dependency. Existing unrelated working-tree changes
are intentionally excluded from the billing release.
