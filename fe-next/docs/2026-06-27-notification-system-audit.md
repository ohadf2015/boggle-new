# Notification System Audit & Improvements — 2026-06-27

Goal: improve the notification system — gaps, issues, and weak copy (incl. push).
Method: mapped in-app / push / email; then **verified every claim in code** before
acting (this repo's memory repeatedly flags secondhand audit bullets as fabricated).

## TL;DR

The system is in good shape post the 2026-05-01 push audit. Most "gaps" a survey
flagged turned out to be already-fixed or deliberate. Two real, in-scope issues
found and fixed; the rest documented as deferred / by-design.

## Verified findings

| Claim (from survey) | Verdict | Evidence |
|---|---|---|
| Welcome email not wired ("PREVIEW ONLY") | **FALSE** | Fires on every signup via `onAuthStateChange('SIGNED_IN')` → `triggerWelcomeEmail` → `/api/email/send-welcome`, idempotent DB guard (`welcome_email_sent_at`). |
| Re-engagement email manual-only | **FALSE** | Scheduled hourly in **both** scheduler paths: `backend/queues/cronQueue.ts:176` (BullMQ) + `backend/services/cronScheduler.ts:577` (node-cron fallback). The survey only checked Vercel/Railway cron — this app schedules via BullMQ. |
| In-app types not visually differentiated | **FALSE** | `NotificationItem` already maps per-type icon + color (`NOTIFICATION_TYPE_ICONS/COLORS`). |
| No silent-failure on triggers | **CONFIRMED OK** | All `both`-mode triggers save in-app history regardless of prefs; `challenge_declined` is intentionally in-app-only; daily-reminder dropping when its own category is off is correct-by-design. |
| Two gift key sets, one dead | **FALSE** | Both live. `giftReceived.*`/`giftLabel.*` = item-gift flavor (`pushNotificationTriggers.ts:667`); `gift.*` = XP/coins/badge flavor (`pushNotificationService.ts:486-497`, batch/admin send). Survey + a verifier both missed the second consumer; caught by the render test gate. No deletion. |
| In-app timestamps English-only | **TRUE (new) → fixed** | `NotificationItem` used `date-fns formatDistanceToNow` with no locale → "2 hours ago" in English for he/sv/ja/es. Dedicated `notifications.{justNow,minutesAgo,…}` keys existed but were unused. |

## Shipped this session

1. **i18n timestamp fix** — `NotificationItem` now renders relative time via the
   existing `notifications.*` keys (singular/plural, 5 langs). Pure helper
   `formatNotificationTime` + unit tests. No new dependency (date-fns locales are
   not used anywhere else in the app).
2. **Celebratory copy lift** — `achievement`, `levelUp.body`, `giftReceived` push
   copy raised to the brand voice (loud/party) in **en/sv/ja/es**, native
   non-literal (one emoji max per skill guidance). **Hebrew deliberately left
   untouched** — blind RTL-punctuation edits are a documented footgun here, and
   HE native review is already a tracked item; lifting it without render
   verification would risk breakage. Transactional pushes (friend request,
   your-turn, invite, DM, challenge) left clear on purpose — clarity beats cute.

## Deferred (deliberate, with reason)

- **Daily-challenge *email*** (`send-daily`) is unwired. A daily *push* reminder
  already exists (`daily-challenge-reminder` cron). Adding the email too = redundant
  double-notification. Product call, not a bug — enable only if push proves
  insufficient.
- **Web push** — native (FCM iOS/Android) only; no service worker. Real infra
  cost; web users are a minority and pre-traction (~315 users). Not now.
- **Season fan-out chunking** (`notifySeasonStart` un-chunked `Promise.allSettled`)
  — only bites at 5k+ players. Pre-traction; defer.
- **Hebrew copy native review** — flagged 2026-05-01. Not eyeball-fixed here; RTL
  punctuation "fixes" without render verification are a documented footgun.
</content>
</invoke>
