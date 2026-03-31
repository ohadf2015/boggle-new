# PostHog Integration Report — LexiClash

## Summary

PostHog analytics is fully integrated into the LexiClash Next.js App Router application. Client-side and server-side event capture are both active.

**Project:** LexiClash (PostHog project 151059, EU region)
**Host:** https://eu.i.posthog.com
**Dashboard:** [Analytics basics](https://eu.posthog.com/project/151059/dashboard/597710)

---

## Client-side initialization

**File:** `fe-next/components/providers/PostHogProvider.tsx`

- GDPR-compliant: `opt_out_capturing_by_default: true` (users must grant consent before any events are sent)
- `capture_exceptions: true` — automatic unhandled JS error and promise rejection tracking
- `capture_pageview: false` — manual page-view control to avoid double-counting with the App Router
- `capture_pageleave: true`
- `persistence: 'localStorage+cookie'`
- Consent is gated via `cookie-consent-granted` / `cookie-consent-revoked` window events

**Env vars required:**
```
NEXT_PUBLIC_POSTHOG_KEY=<your-posthog-project-key>
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

---

## Server-side initialization

**File:** `fe-next/lib/posthog.ts`

Lazy singleton via `getPostHogServer()`. Uses `posthog-node` with `flushAt: 1` and `flushInterval: 0` for immediate delivery. Returns `null` gracefully when env vars are absent.

---

## Events

### Pre-existing (not modified)

| Event | Where | Notes |
|---|---|---|
| `growth:*` (30+ events) | `fe-next/utils/growthTracking.ts` | Client-side, prefixed `growth:` |
| `user_identified` | `fe-next/contexts/AuthContext.tsx` | Client, on login/signup |
| `user_logged_out` | `fe-next/contexts/AuthContext.tsx` | Client, on logout |
| `purchase_completed` | `app/api/purchases/verify-xsolla/route.ts` | Server |
| `purchase_refunded` | `app/api/purchases/verify-xsolla/route.ts` | Server |
| `$exception` (automatic) | `PostHogProvider.tsx` | Via `capture_exceptions: true` |

### Added in this integration

| Event | File | Trigger | Key properties |
|---|---|---|---|
| `email_subscribed` | `app/api/subscribe-email/route.ts` | Successful email subscription | `source`, `utm_source`, `utm_medium`, `utm_campaign` |
| `adventure_level_attempted` | `app/api/adventure/attempt/route.ts` | Level attempt without completion | `world`, `level`, `words_found`, `score`, `attempt_count` |
| `adventure_level_completed` | `app/api/adventure/attempt/route.ts` | Successful level completion | `world`, `level`, `words_found`, `score`, `time_remaining`, `consecutive_failures_before` |
| `blast_completed` | `app/api/blast/result/route.ts` | Blast game result saved | `difficulty`, `score`, `stars`, `is_new_best_score`, `xp_awarded` |
| `drill_completed` | `app/api/drills/submit/route.ts` | Drill submission saved | `drill_type`, `level`, `score`, `words_found`, `xp_awarded`, `cognitive_domain` |
| `coins_awarded` | `app/api/coins/route.ts` | Coins awarded to user | `amount`, `reason`, `new_balance` |
| `coins_spent` | `app/api/coins/route.ts` | Coins spent by user | `amount`, `reason`, `new_balance` |

---

## Dashboard

**[Analytics basics](https://eu.posthog.com/project/151059/dashboard/597710)** — ID 597710

| Insight | Type | URL |
|---|---|---|
| Game engagement funnel | Funnel | https://eu.posthog.com/project/151059/insights/M4AtiblQ |
| Daily active game sessions (30d) | Trends line | https://eu.posthog.com/project/151059/insights/H9ELgBpU |
| Blast & drill completions by difficulty | Trends bar | https://eu.posthog.com/project/151059/insights/UaULm9DB |
| New user signups (30d) | Trends line | https://eu.posthog.com/project/151059/insights/cGg29WaW |
| Adventure level completions vs attempts | Trends line | https://eu.posthog.com/project/151059/insights/ANUOpysl |
