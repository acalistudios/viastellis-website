# Agent action log

Actions that **git cannot show you**: deploys, applied migrations, secrets set,
and changes in external dashboards. Three agents work this repo — Claude Code,
Codex, Antigravity — and none can see the others. Every cross-agent surprise so
far came from one of these going unrecorded.

**Append one line whenever you do something outside the repo.** Newest at the
bottom. See [AGENTS.md](../AGENTS.md) for the full working agreement.

```
YYYY-MM-DD HH:MM  agent  TYPE  what happened
```

`TYPE` is one of: `DEPLOY` · `MIGRATE` · `SECRET` · `EXTERNAL` · `NOTE`

Keep entries to one line. If something needs explaining, put the detail in the
commit message or a handoff note and reference it here.

---

## 2026-09-10

```
2026-09-10 14:20  claude   DEPLOY    revenuecat-webhook deployed (--no-verify-jwt) from the PRE-rewrite version
2026-09-10 14:20  claude   NOTE      that deploy predates Codex's rewrite of the same file; live version is older than disk
2026-09-10 15:10  claude   NOTE      apply_billing_event does NOT exist in the DB; Codex's rewritten revenuecat-webhook calls it — do not deploy that file until the migration lands
2026-09-10 15:30  claude   NOTE      set_subscription still has 3 overloads (6/7/8-arg); a 7-arg named call errors "is not unique". Keep the 8-arg, drop the others. Owner: Codex
2026-09-10 16:05  claude   DEPLOY    pushed main efcaaf5 — removed android/ from this public repo (was only ever deleted locally, never pushed). Pages deploy succeeded
2026-09-10 16:40  claude   DEPLOY    pushed main 5316cfb — portable capacitor.config.ts + VITE_REVENUECAT_PUBLIC_KEY wiring. Pages deploy succeeded, site HTTP 200
2026-09-10 16:50  claude   EXTERNAL  created PRIVATE repo acalistudios/viastellis-android and pushed the native project (2 commits)
2026-09-10 16:55  claude   NOTE      audited all 116 commits of this public repo's history: no real secrets ever committed; .env never tracked
```

### Earlier, reconstructed (not logged at the time)

```
2026-09-08  antigravity  MIGRATE   2026-09-08_subscription_source.sql — added profiles.subscription_source and an 8-arg set_subscription overload ALONGSIDE the existing ones
2026-09-08  antigravity  EXTERNAL  created the Play Console app entry com.acalistudios.viastellis
2026-09-09  antigravity  NOTE      built app-release.aab UNSIGNED (gradle signingConfig was gated on a property defined nowhere); superseded — signing now comes from the Studio wizard
2026-09-10  codex        MIGRATE   20260910130000_atomic_stripe_events.sql — created apply_stripe_event
2026-09-10  codex        NOTE      moved supabase/ and scripts/ into this PUBLIC repo (audited: no secrets). Open question for Hans — contradicts the documented private-parent split
```

### Billing repair continuation (Pacific time; earlier actions reconstructed)

```
2026-09-10 18:59  codex  MIGRATE  Applied and registered 20260910210000 billing_rpc_permissions, 20260910211000 provider_entitlements, 20260910220000 credit_helper_permissions, and 20260910223000 subscription_rpc_signature. apply_billing_event now EXISTS; only the 8-argument set_subscription remains, backend-only.
2026-09-10 18:59  codex  DEPLOY   Deployed stripe-webhook, create-checkout-session, cancel-subscription and revenuecat-webhook AFTER applying provider_entitlements; all four use the tested independent-provider architecture. Also replaced the unsafe smart-worker cancellation alias with an import of cancel-subscription.
2026-09-10 18:59  codex  EXTERNAL Tagged the nine explicitly verified Shattered Saga LIVE prices/products with app=shattered-saga. Added async_payment_succeeded to both LIVE endpoints and invoice.paid to Shattered Saga. OtherImpact unchanged; no live charges or subscription cancellations made.
2026-09-10 18:59  codex  SECRET   Temporary BILLING_AUDIT_TOKEN and authenticated billing-audit function used for catalog inspection/repair; must remove both before final sign-off. No Stripe keys written to source.
2026-09-10 18:59  codex  NOTE     Cross-owner RevenueCat change preserves Claude's period-aware product mapping, fails closed, validates environment/product namespace, and uses atomic Play entitlement/grant projection. DB prerequisites verified live; malformed/missing auth returns 401. Play sandbox acceptance still needs verification.
2026-09-10 18:59  codex  NOTE     Shared pricing.ts now uses server-resolved Stripe lookup keys; existing Play product IDs preserved. Added billing tests to deploy.yml. Upgrade cancellation remains reachable after payment failure and for separate Stripe/Play subscriptions. No Android native files changed.
2026-09-10 18:59  codex  NOTE     Source/runtime tests pass: real PGlite transaction/permission/refund suite, actual Deno handler suite, and full tsc/Vite build. Production billing RPC public access count is zero; all eight unauthenticated endpoint checks reject correctly. Stripe dashboard already signed in to test mode for final sandbox checks.
```
