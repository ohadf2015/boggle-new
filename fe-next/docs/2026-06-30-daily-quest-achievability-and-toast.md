# Daily Quests: achievability + completion toast fix (2026-06-30)

## Goal
Every daily quest must be completable via the route it steers players to, and players must get a completion toast.

## Findings (verified against code + prod data)

The condition-based daily quest pool (`shared/dailyQuestPool.ts`) is sound, and the
pure evaluator + slot persistence work. The defects are **steering** and **toast timing**.

### Each game-end seam only credits a subset of metrics
| Seam (route) | fields populated | source |
|---|---|---|
| classic socket (`/multiplayer`) | score, longestWordLength, wordsFound, **maxCombo**, mpWin/beatHuman | `backend/services/gameLifecycle/gameResults.ts:286-307` |
| brain (`/brain`) | score, wordsFound | `app/api/drills/submit/processCompletion.ts:441-445` |
| word-hunt (`/daily`) | longestWordLength, wordsFound | `backend/routes/dailyChallenge/wordHuntRoutes.ts:338-344` |
| single-player (`/singleplayer`) | **nothing** — never reaches a seam, no `comboLevel` | client-only, `components/singleplayer/...` |

### Mis-steered skill quests (the bug)
- `combo_4`/`combo_6` → `/singleplayer`: SP never hits the seam and has no `comboLevel` ⇒ `maxCombo` always 0 ⇒ **never completable** there.
- `score_300`/`score_500` → `/daily`: Word Hunt has only `efficiencyScore` (leaderboard, wrong scale), no session `score` ⇒ **never completable** there.
- `words_15` → `/daily`: Word Hunt embeds **max ~14** words ⇒ **structurally impossible**.
- `long_word_7` → `/daily`: daily grid target length not guaranteed ≥7 (can be 4-5) ⇒ unreliable.
- `long_word_6` → `/daily`: same — works only when target happens to be ≥6.

The classic `/multiplayer` socket seam is the **only** route that reliably credits
every skill metric, and it works solo-vs-bots (skill quests don't require
`isMultiplayer`). One classic game can complete several skill quests at once.

Prod (since 2026-06-27): combo_6 completed once (via real MP, not the quest link);
score quest first appeared 06-30 with no completions; 1 completion never toasted.

### Toast timing gap
Daily-quest toasts are driven only by `useDailyMissions` (mounted persistently in
`GlobalBottomNav`), which refetches the row on **mount + visibilitychange only**.
Server completion is fire-and-forget. After an in-app game that completes a quest,
nothing refetches if the tab never backgrounds ⇒ toast delayed/missed in-session.
(Weekly quests already get an immediate socket-pushed toast; daily ones don't.)

## Fix (minimal, no architecture change)
1. **Achievability** — repoint all skill quests (`longWord`, `score`, `wordsInGame`,
   `combo`) to `/multiplayer`, the only seam that credits their metric. No fake
   Word-Hunt score synthesis (wrong scale). `playMode`/`pvp` hrefs unchanged.
2. **Toast** — `useDailyMissions` also refetches on `usePathname()` change, with one
   short delayed retry to cover the fire-and-forget completion write. Single file,
   covers all 3 seams, **no Realtime** (per `50-supabase-perf.md`).

## Tests (TDD)
- `shared/__tests__/dailyQuestPool.test.ts`: invariant — every quest's `href` routes
  to a seam that can credit its condition type.
- `hooks/__tests__/useDailyMissions.test.ts`: toast fires after a route change
  (post-game in-app navigation), not just visibilitychange.

## Out of scope (noted)
- Wiring `/singleplayer` to credit quests (instant, no lobby) would be better UX than
  pushing skill quests to `/multiplayer` matchmaking, but needs a new submit endpoint
  + `comboLevel` in SP scoring — a feature, not a fix. Revisit if MP-lobby abandonment
  rises from this steering change.
