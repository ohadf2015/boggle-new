# Offline Mode — Phase 2 Plan: Daily Challenges + Universal Score Queue

**Date**: 2026-05-11
**Depends on**: Phase 0 + 1 shipped (storage layer, network state, dict loader, SP queue).
**Scope**: Daily-puzzle pre-fetch; universalize score queue across all daily modes; reconciliation UI; cross-midnight prefetch.

---

## Goals
- App opens offline → today's daily puzzles (WOTD, daily-survival, daily-wordhunt, daily brain drills) all playable.
- Late-night offline play across midnight boundary works (Tokyo at 08:00 local on day-N reads day-N puzzle, not day-(N-1)).
- Scores from all daily modes queue + sync server-wins.
- Streak system continues to honor `awardKey` localStorage dedup precedent.

---

## Tasks

### 2.1 Server: daily-prefetch endpoint
- New route `app/api/daily/prefetch/route.ts`.
- Accepts `{ language, modes: ['wotd'|'survival'|'wordhunt'|'brain'][], windowDays: 1|2|3 }`.
- Returns: `{ puzzles: [{ date, language, mode, payload, validUntil }] }`.
- Server caches per-mode Redis 5min (existing `dailyChallengeRouter.getCurrent` pattern).
- Window = today + N. Default N=1 (next-day) so cross-midnight TZ works.
- Auth: requires session; guest gets WOTD only.

### 2.2 Client: prefetch worker
- New `lib/offline/prefetchDaily.ts`.
- Triggers:
  - App foreground + online + last-prefetch > 6h ago.
  - Manual call from settings → "Sync daily content now".
- Stores blobs in `daily_puzzles_cache` keyed by `(date, language, mode)`.
- TTL: drop rows where `date < today - 7`.
- Telemetry: `offline_daily_prefetched { modes, count, durationMs }`.

### 2.3 Daily mode reads from cache when offline
- Edit `lib/dailyChallenge/getCurrent.ts` (or equivalent tRPC consumer).
- Decision tree:
  1. `online` → existing server call (no behavior change).
  2. `!online` → SQLite `SELECT * FROM daily_puzzles_cache WHERE date=? AND language=? AND mode=?`.
  3. Miss → render `<DailyOfflineFallback />` with CTA "Connect to play today's challenge".

### 2.4 Universal score queue (extends Phase 1)
- Extend `lib/offline/scoreQueue.ts` to handle modes: `wotd | daily-survival | daily-wordhunt | brain-{drillId} | sp | adventure | classroom`.
- Per-mode payload shapes typed via discriminated union.
- Streak award key: include `puzzleDate` in `id` payload — server uses for "this counts toward day-N streak" dedup.

### 2.5 Server: extend `/api/scores/sync`
- Add per-mode validators in a `validators/` directory.
- For daily modes: server checks puzzle-date is within ±1 day of `clientCompletedAt` (sanity floor) and `puzzleId` exists. Otherwise `accepted=false, reason='puzzle_expired'`.
- Awards (coins, streak): mode-specific. Reuse existing per-mode award paths.

### 2.6 UX: pending-sync badge + reconciliation feed
- Header chip: "N pending sync" when queue has rows. Clicking opens a list:
  - Per row: mode, date, score, status (`queued | syncing | rejected`).
- After sync: toast per-mode summary. Show `from→to` if adjusted; show `t('offline.sync.rejected.expired')` for `puzzle_expired`.

### 2.7 Cross-midnight safety
- Prefetch worker always pulls **today + tomorrow** when scheduler approaches local midnight (>= 22:00 local).
- Server respects `language` for puzzle dates — daily puzzles are global, so `date` is canonical UTC; client just maps local midnight to UTC date when querying cache.

---

## TDD Tasks

1. **RED** `prefetchDaily.test.ts` — first call stores N puzzles; second call within 6h is no-op.
2. **GREEN** implement worker.
3. **RED** offline daily-survival read returns cached puzzle for today's date.
4. **GREEN** wire cache lookup into `getCurrent`.
5. **RED** `/api/daily/prefetch` returns 2 days when `windowDays=2`; respects locale.
6. **GREEN** implement route + Redis pass-through.
7. **RED** score queue accepts `wotd | daily-survival | daily-wordhunt | brain-vocabulary | brain-spelling` payloads (discriminated union).
8. **GREEN** typed validators.
9. **RED** sync route rejects expired daily submission (puzzle_date < clientCompletedAt - 2 days) with `reason='puzzle_expired'`.
10. **GREEN** implement date guard.
11. **RED** streak award: offline WOTD score for yesterday syncs today → awards yesterday's streak slot, not today's.
12. **GREEN** wire `puzzleDate` through award path.
13. **RED** pending-sync badge appears when queue non-empty, disappears when drained.
14. **GREEN** implement badge component.
15. **RED** TZ test: client at UTC+9, prefetches at 22:00 local (13:00 UTC) — receives today + tomorrow UTC dates.
16. **GREEN** implement local-midnight detection in prefetch trigger.

---

## Acceptance — Phase 2
- Manual Android airplane-mode test:
  - WOTD plays offline, score queued, syncs on reconnect ✓
  - Daily survival plays offline ✓
  - Daily wordhunt plays offline ✓
  - At least one brain drill plays offline ✓
- Cross-midnight: connect at 22:00 local → prefetch fires → airplane mode at 00:30 → tomorrow's WOTD playable ✓
- Reconciliation: offline submit with deliberately-rejected word → toast shows correct count + final score ✓
- Streak audit: offline WOTD on day-N synced on day-(N+1) credits day-N streak slot, no double-award ✓
- `npm run lint && npm run test && npm run build` clean.
- PostHog: `offline_daily_prefetched`, `offline_score_queued{mode}`, `offline_score_synced{mode, rejectedCount}` all firing.

---

## File-Touch Manifest

**New**:
- `app/api/daily/prefetch/route.ts`
- `lib/offline/prefetchDaily.ts`
- `lib/offline/scoreValidators/{wotd,survival,wordhunt,brain}.ts`
- `components/offline/PendingSyncBadge.tsx`
- `components/offline/SyncFeedDrawer.tsx`
- `components/offline/DailyOfflineFallback.tsx`
- `__tests__/lib/offline/prefetchDaily.test.ts`
- `__tests__/api/daily/prefetch.test.ts`

**Edited**:
- `lib/offline/scoreQueue.ts` (mode union expansion)
- `lib/dailyChallenge/getCurrent.ts` (cache-first when offline)
- `app/api/scores/sync/route.ts` (per-mode validators + date guards)
- `translations/{en,he,sv,ja,es}.js` (offline.sync.*, offline.pending.*)
- `app/[locale]/layout.tsx` (mount badge)

---

## Risks

| Risk | Mitigation |
|---|---|
| Prefetch payload bloat (4 modes × 2 days × 5 locales = 40 puzzles) | Per-call language-scoped (always 1 locale). Total <50KB/sync. |
| Server cron generates next-day puzzle at 00:00 UTC; prefetch at 21:50 UTC misses it | Worker re-runs on app foreground + once at 00:30 UTC via background task. |
| Streak system silently double-awards if server doesn't dedup on submissionId | Mandatory unique-constraint enforcement on `(user_id, puzzle_date, mode)` in addition to `submissionId`. |
| Cache stale: user offline for >7 days returns to find tomorrow's puzzle | Drop stale entries on prefetch; show `t('offline.daily.stale')` if all entries expired. |
| Guest user prefetch endpoint abuse (DoS) | Rate-limit per-IP at edge; guest gets WOTD-only (smallest payload). |
