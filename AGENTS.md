# Working agreement for AI agents on ViaStellis

Three agents work on this project — **Claude Code**, **Codex**, and **Antigravity**
— plus Hans. None of them can see each other. This file is the shared contract.

`CLAUDE.md` and `GEMINI.md` are pointers to this file; keep the content here so
the three cannot drift apart.

---

## 1. Before you start: fetch

```
git fetch origin && git status -sb
```

Another agent has very likely pushed since your last session. On 2026-09-10 a
stale local `main` (2 behind, 1 unpushed ahead) caused a failed rebase that left
the working tree half-written. Thirty seconds of fetching prevents that.

## 2. After any action git cannot see: log it

Append one line to **`docs/AGENT_LOG.md`**.

Git shows file edits. It does **not** show deploys, applied migrations, secrets
set, or dashboard changes — and those are exactly what bite the next agent. Every
cross-agent surprise so far has come from an unlogged side effect.

Log these:

| Type | Examples |
|---|---|
| `DEPLOY` | `supabase functions deploy …`, a push that triggers Pages |
| `MIGRATE` | SQL applied to the production database |
| `SECRET` | a Supabase / GitHub / RevenueCat secret set or rotated |
| `EXTERNAL` | Stripe, Play Console, RevenueCat, DNS changes |
| `NOTE` | anything the next agent would be surprised by |

Format: `YYYY-MM-DD HH:MM  agent  TYPE  what happened`

## 3. Ownership — stay in your lane

Editing outside your area is allowed when needed, but **say so in the log**, and
prefer handing it back to the owner if work is in flight there.

### Codex — Stripe billing
```
supabase/functions/stripe-webhook/
supabase/functions/create-checkout-session/
supabase/functions/cancel-subscription/
supabase/functions/_shared/stripeApp.ts, stripePrice.ts, billingCatalog.ts
supabase/migrations/   (all billing: set_subscription, apply_stripe_event, apply_billing_event)
scripts/backfill-stripe-app-metadata.mjs, setup-stripe-products.mjs
```

### Claude Code — Android, RevenueCat, growth
```
capacitor.config.ts, capacitor.local.json
supabase/functions/revenuecat-webhook/
src/lib/purchases.ts
marketing/
docs/google-ads-starter.md
the separate Android repo: acalistudios/viastellis-android
```

### Antigravity — as assigned by Hans
Built the original Capacitor/Android scaffold. No standing area; Hans assigns
per task. **Check this file and the log before touching billing or Android** —
both now have an owner.

### Shared (coordinate first)
```
src/config/pricing.ts     ← credit amounts must match Stripe, Play, and both webhooks
.github/workflows/deploy.yml
.gitignore
```

## 4. Don't deploy someone else's half-finished work

A file on disk is not necessarily deployable. On 2026-09-10, `revenuecat-webhook`
on disk called `apply_billing_event`, which did not exist in the database — a
deploy would have failed every purchase.

Before deploying a function you did not write: check the log, and confirm the DB
objects it calls actually exist.

## 5. Public vs private

- **`viastellis-website` is PUBLIC.** Anything committed here is world-readable,
  and git history keeps it even after deletion.
- `acalistudios/viastellis-android` is **private**.
- Native Android code lives in that separate repo — never re-add `android/` here.
- Any `VITE_`-prefixed value ships inside the client bundle. Treat it as public.
  Real secrets (`sk_live`, service-role keys, webhook secrets) belong only in
  Supabase / GitHub secret stores, never in any repo — public or private.

## 6. Verify before claiming done

- `npx tsc -b` (not just `vite build`) before saying the compile is clean.
- Confirm a deploy actually succeeded rather than assuming it did.
- State plainly what you did **not** verify.

## 7. Hans's standing rules

- Never push to `main` or deploy the live site without explicit consent.
- Shell is **Windows PowerShell 5.1** — it rejects `&&`; chain with `;`.
- Give exact paths, full URLs, and literal menu steps, not summaries.
