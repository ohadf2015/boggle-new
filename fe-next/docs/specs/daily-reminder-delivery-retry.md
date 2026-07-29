# Spec: Daily-challenge reminder — deliver-aware marking + rival-lookup guard

## Problem (user report)
"Somedays the daily-challenge push isn't sent at all. If the rival didn't play that
day it should still send a general notification."

## Investigation (verified against source + Sentry)
- Cron `POST /api/cron/daily-challenge-reminders` (hourly) and the BullMQ mirror
  `backend/services/dailyChallengeReminder.ts` both pick recipients, look up a
  leaderboard rival, then send rival-themed OR general copy.
- Sentry: **zero 500s** on the route — only an info-level "completed" message. So the
  cron runs and completes. The "rival lookup throws → kills batch" path is NOT the
  active production cause.
- **Root cause (sticky, whole-day):** `notifyDailyChallengeReminder` ALWAYS resolves
  even when nothing is delivered — `sendToUser` swallows FCM failures and returns
  `void`; `isPushAllowed` fail-opens. The cron marks `profiles.last_daily_push_sent_at
  = today` for every *fulfilled* promise (= every recipient, delivered or not). A
  single non-delivering tick at the user's scheduled hour → user excluded the rest of
  the day → no retry → whole-day silence. Telemetry still says "N sent".
- Secondary (latent): `findDailyChallengeRivals` is an unguarded hard dependency of
  the send batch in both paths. A *sustained* throw (e.g. oversized `.in()` on busy
  days) would suppress general notifications too. Not firing today, but a landmine and
  exactly the failure shape the user describes.

## Changes
1. `sendToUser` (`fcmService.ts`): return delivered count (`Promise<number>`) instead
   of `void`. All early-returns → 0. Additive — existing callers ignore it.
2. `notifyDailyChallengeReminder` (`pushNotificationTriggers.ts`): return
   `Promise<boolean>` = "was actually dispatched to ≥1 device". `push_only` path, so
   it inlines pref-check + `sendToUser` (no history branch lost). On non-delivery →
   `false`.
3. Cron route + BullMQ service: only `markDailyPushSentBatch` the recipients whose
   send returned `true`. Non-delivered → left unmarked → retried on the next hourly
   tick. Telemetry distinguishes attempted vs delivered.
4. Guard `findDailyChallengeRivals(...)` in both paths with try/catch → empty Map on
   throw, so a rival-enrichment failure degrades to all-general, never zero sends.

## Out of scope
- Per-recipient rival→general fallback inside the send loop (rival copy is a pure
  function; not a real throw risk). Confirmed unnecessary.
- Changing the shared `triggerPush` signature (avoids ~15-caller ripple).

## Tests (TDD)
- `sendToUser` returns successCount; returns 0 on no-token / no-firebase / error.
- `notifyDailyChallengeReminder` → true when delivered>0, false when pref-blocked or
  delivered=0.
- Route + service: rival lookup throws → general still sent to all recipients,
  response success; only delivered users marked.
