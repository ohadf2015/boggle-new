# Push Notifications Audit — 2026-05-01

**Scope:** End-to-end push pipeline. Locale routing, copy quality, duplicate prevention.

**TL;DR:** Plumbing is correct (locale lookup, dedup of stale tokens, pref gating). Content layer was the gap — non-EN users got the same single line every day, and several call sites fired N pushes for what should be one notification. Shipped four fixes in this audit; one architecture concern (season fan-out scaling) flagged for follow-up.

---

## Architecture (as-found)

**Two parallel send paths into FCM:**

| Path | Caller | Pre-localize | Persist history |
|------|--------|--------------|-----------------|
| `pushNotificationService.sendToUsers` (HTTP v1) | tRPC admin, gift sender | Per-recipient via `renderNotification` | Yes, before send |
| `triggerPush` → `fcmService.sendToUser` (firebase-admin SDK) | All `notify*` triggers | Caller-side via `translatePush` | After send via `saveNotificationHistory` |

Both honor `profiles.language` for locale and fail-open to `en`. Both honor `user_notification_preferences`. Both deactivate stale FCM tokens on rejection.

**Locale routing flow:**
```
notify*(userId, …) → getUserLocale(userId) → translatePush(locale, key, params)
                                                    ↓
                              backend/utils/pushTranslations.ts STRINGS dict
                                  (he | en | sv | ja | es)
```

**Daily-reminder cron:**
- Recipient gate (`lib/pushReminders.ts`): active token + not-played-today + not-pushed-today + opted-in + 17:00–19:00 local window. ✅ Correctly idempotent at row level via `last_daily_push_sent_at`.
- Copy picker (`lib/dailyReminderCopy.ts`): variant index = `hash(userId|date) %% N`. Deterministic per user-day.

---

## Findings

### F1 — Daily reminder copy: 15 EN variants, 1 line for HE/SV/JA/ES *(SHIPPED)*
**Severity:** High. User's literal "witty + native" complaint.
**Before:** `pickDailyReminderCopy` rotated 15 witty English templates but for any non-EN locale fell back to a single static `dailyChallenge.title/body` from `pushTranslations.ts`. Every Hebrew user saw the same line every day.
**After:** 15 native templates per locale in `lib/dailyReminderTemplates.ts`. Same hash slot per user-day, so analytics buckets remain stable across locales. Tests assert template count parity + locale-specific markers (e.g. every ES variant must contain accented char or `¿/¡`).
**Native-review flag:** HE and JA copy authored without native speaker review. Per `feedback-ai-hebrew-translation` memory, ship + flag rather than block. Open in a follow-up to validate idiom + tone.

### F2 — Achievement push uses English-derived display name *(SHIPPED)*
**Severity:** High. Hebrew user gets "Word Master" in body, not "אדון המילים".
**Before:** `gameResults.ts:344-348` derived a Title-Case English name from `achievement.key` (`WORD_MASTER` → `Word Master`) and passed that string verbatim to `notifyAchievement`. Locale lookup in the trigger then noop'd because the body was already a literal string.
**After:** `notifyAchievement(userId, key)` resolves the localized name via the existing `translations.<locale>.achievements.<KEY>.name` table (already populated for all 5 locales). Falls back EN → humanized key. Backwards-compatible: legacy callers passing pre-localized strings still work because unknown "keys" route through the same humanizer that previously produced them.

### F3 — Direct-message bursts: per-message push *(SHIPPED)*
**Severity:** High UX bug. 5 messages = 5 lock-screen banners.
**Before:** `friendMessagingHandler.ts:92` fired `notifyDirectMessage` per message; each call always pushed unless recipient socket online.
**After:** Redis-backed coalesce window in `backend/modules/pushDedup.ts`. Key `push:dm:{recipient}:{sender}` w/ 60s TTL via `SET NX EX`. First message in window pushes; subsequent only land in `user_notifications` history. Fail-open on Redis errors. Preserves complete in-app message history regardless of push state.
**Trade-off:** If user reads one DM then goes offline before sender's burst ends, they may miss the *push* for follow-ups but still see them in-app on next launch. Acceptable — coalescing is the goal.

### F4 — Achievement multi-unlock: N pushes for one game-end *(SHIPPED)*
**Severity:** Medium. Game ending with 3 achievement unlocks = 3 sequential lock-screen banners.
**Before:** `gameResults.ts` looped `notifyAchievement` per unlock.
**After:** New `notifyAchievementsBatch(userId, keys[])` coalesces:
- 1 key → existing single-line copy
- 2 keys → "You earned: A & B"
- 3+ keys → "You earned: A, B +N more"
All 5 locales have batch copy keys (`achievement.titleMulti`, `achievement.bodyTwo`, `achievement.bodyMore`). Single in-app row per game-end batch.

### F5 — Season-start fan-out scales linearly *(NOT FIXED — flagged)*
**Severity:** Medium. Will bite at scale.
**Location:** `backend/modules/seasonManager.ts:113`.
**Issue:** `Promise.allSettled(ids.map(id => notifySeasonStart(...)))` dispatches N concurrent FCM calls + N concurrent profile/pref/history queries. At 5k players this saturates the Supabase pool and rate-limits FCM. Functions correctly today (player count is small) but is a latent ship-blocker.
**Recommended fix:** Chunk to batches of 50–100 with `Promise.allSettled` per batch + `await` between chunks; or move to BullMQ queue for backpressure.

### F6 — Two write paths to `user_notifications` share no idempotency *(NOT FIXED — flagged)*
**Severity:** Low. Theoretical risk; no observed duplicates in production.
**Issue:** Admin tRPC path (`pushNotificationService.sendToUsers`) and trigger path (`triggerPush.saveNotificationHistory`) both insert into `user_notifications`. No event/idempotency key column means a future caller invoking both for the same logical event would produce two history rows.
**Recommended fix (deferred):** Add `event_key VARCHAR(100) UNIQUE NULLABLE` + UNIQUE INDEX `(user_id, event_key)`; back-end callers pass an event-derived key. Schema change — out of scope for this audit per advisor recommendation.

### F7 — Hebrew bidi anomaly with Latin sender names *(NOT FIXED — design call)*
**Severity:** Cosmetic.
**Issue:** Strings like `'!שלח/ה לך בקשת חברות {sender}'` render correctly in pure-RTL but interleave Latin chars (`{sender}` = "Ohad") with leading `!` cause OS bidi reorder differences between Android and iOS. Not a real bug — display correct on both platforms after FCM render — but visually inconsistent.
**Recommended:** wrap `{sender}` with U+202B/U+202C bidi control chars in HE strings if user reports complaints.

---

## Coverage of user's three asks

| Ask | Status |
|-----|--------|
| Player gets push in their language | ✅ verified plumbing; F1 closed content gap; F2 closed achievement-name leak |
| More witty + native feel | ✅ F1 — 15 native templates × 5 locales |
| No duplicate pushes | ✅ F3 (DM coalesce), F4 (achievement batch). Daily reminder dedup already correct. F6 deferred (no observed prod duplicates). |

---

## Files touched

- `fe-next/backend/utils/pushTranslations.ts` — added `achievement.{titleMulti,bodyTwo,bodyMore}`, `directMessage.bodyMulti` × 5 locales
- `fe-next/backend/modules/pushNotificationTriggers.ts` — `resolveAchievementName`, `notifyAchievementsBatch`, DM coalesce wiring
- `fe-next/backend/modules/pushDedup.ts` *(new)* — Redis-backed DM coalesce helper
- `fe-next/backend/services/gameLifecycle/gameResults.ts` — switched per-achievement loop to batch call
- `fe-next/lib/dailyReminderTemplates.ts` *(new)* — 15 templates × 5 locales
- `fe-next/lib/dailyReminderCopy.ts` — locale-aware variant lookup
- Tests: `pushNotificationTriggers.test.ts` (+11 cases), `dailyReminderCopy.test.ts` (+3 cases). All green.
- `npm run build:fast` ✅
