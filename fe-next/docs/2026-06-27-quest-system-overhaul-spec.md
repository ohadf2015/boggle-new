# Quest System Overhaul — Spec

**Date:** 2026-06-27
**Goal:** Daily quests are too simple/repetitive ("play a Word Hunt game"). Replace mode-completion grinds with **specific in-gameplay skill achievements**, a **PvP "beat a human opponent" quest** (same-language is already guaranteed), steer players to **public modes only** (no beta/adventure), add **proportional celebration**, and add **social proof** (a recent-achievements feed broadcasting completions to encourage others).

---

## Diagnosis (verified)

- **Current daily = mode grind.** `dailyQuestPool.ts` rotates 3 *modes* (`wordHunt`, `multiplayer`, `brainDrills`); completion = "finish any game in that mode." No skill, no variety → repetitive.
- **Skill conditions already exist** but are trapped: chapter quests (`questConfig.ts`, adventure-only) + weekly (`combo_15`, `long_words`, `high_score`).
- **One validated game-end seam:** `completeMissionForMode` fires at `backend/services/gameLifecycle/gameResults.ts:278` (all socket modes) and `wordHuntRoutes.ts:331` (word-hunt API). `recordGameResultsToSupabase` (gameResults.ts:119) holds the full result: per-player scores, **human-vs-bot roster** (gameResults.ts:128–132), game language (gameResults.ts:163), placement, longest word, combo.
- **MP is single-language by construction** — `matchmakingQueue.ts:84`: `if (candidate.language !== seeker.language) continue;`. ⇒ "beat a same-language human" = just "beat ≥1 human opponent." No new MP architecture.
- **Public modes (any player):** `classic`, `word-hunt`, `multiplayer`(community/random), `daily-challenge`, `brain-drills`.
  **Beta/admin-gated (MUST NOT appear in quests):** `adventure`, `blast`*, `wheel-rush`*, `word-tower`, `shiritori`, `sealed-bid`, `crossword`.
  *blast/wheel-rush gate is ambiguous across sources → treated as NON-eligible (conservative; safe). Upgrade path: wire `QUEST_PUBLIC_MODES` to the live access gate later.
- **No social broadcast exists.** Celebration (`QuestCompletionToast`) is self-only with normal/grand-slam/all-complete confetti tiers.
- **DB:** `player_daily_missions` has 3 hardcoded booleans (`word_hunt_completed`/`adventure_completed`/`community_completed`) repurposed as **slots 0/1/2**. `weekly_quests` is already a generic JSONB engine (`quest_type`/`requirements`/`current_progress`).

---

## Architecture (lazy-correct: reuse, don't rebuild)

**Daily = single-game skill achievements. Weekly = multi-game accumulation.**

- Single-game-achievable conditions (find a 7-letter word, hit a 5× combo, score ≥500, win an MP game, beat a human, 0-miss round, play a public mode) complete in ONE game ⇒ a **boolean** per slot is sufficient ⇒ **reuse the existing 3-boolean `player_daily_missions` table as-is. NO migration.**
- The 3 booleans stop meaning "mode X done" and start meaning "slot 0/1/2 quest achieved." Which quest fills each slot is derived deterministically from the date seed (same mechanism as today — client & server agree, no per-player storage).
- This reuses the **entire** existing pipeline: XP grant on false→true (dailyMissionsManager.ts:197), Grand Slam, All-Quests-Complete, celebrated flags, `QuestCompletionToast`, QuestHub/QuestCard.

### The evaluation seam

New pure function:
```
evaluateDailyQuests(todaysQuests: DailyQuest[], result: QuestGameResult): slotIndexesCompleted[]
```
- `QuestGameResult` = normalized facts from a finished game: `{ mode, score, longestWordLength, maxCombo, wordsFound, isMultiplayer, isWinner, beatHumanOpponent, mistakes, language }`.
- Called from the two proven seams alongside `completeMissionForMode`:
  - `gameResults.ts` (socket modes) — build `QuestGameResult` from the data already computed there (scores, humanScores roster, placement, game.language).
  - `wordHuntRoutes.ts` (word-hunt API) — build from that route's result.
- For each completed slot, flip the slot boolean false→true via the existing `completeMission` conditional-update path (idempotent, XP-on-transition). **No new completion/XP/celebration code.**

> Class-3 guard: both seams already fire `completeMissionForMode` and both are hit by the reconnect/`requestGameState` fallback (gameLifecycleHandler.ts:654 → endGame → gameScores → recordGameResultsToSupabase). Co-locating the evaluator there inherits that coverage.

> Class-4 guard: evaluator returns the list of slots it completed; the existing `completeMission` logs/grants only on real false→true transition. No silent no-op — a quest that should complete and doesn't will fail a test (below), not vanish.

---

## Daily quest pool (the new content)

`DailyQuest` definition (in `shared/dailyQuestPool.ts`):
```ts
type DailyQuest = {
  id: string;            // stable id, e.g. 'long_word_7'
  type: QuestConditionType;
  target: number;        // threshold (combo size, word length, score, etc.)
  titleKey: string;      // t() key
  descKey: string;       // t() key
  href: string;          // where the GO button sends the player (PUBLIC modes only)
  icon: string;
  family: 'skill' | 'pvp' | 'discovery'; // for celebration tier + feed copy
};
```

`QuestConditionType` (all evaluable from `QuestGameResult`, all Tier-A):
| type | condition | target ex | family |
|---|---|---|---|
| `longWord` | `longestWordLength >= target` | 6 / 7 | skill |
| `combo` | `maxCombo >= target` | 4 / 5 | skill |
| `score` | `score >= target` | 300 / 500 | skill |
| `wordsInGame` | `wordsFound >= target` | 12 / 18 | skill |
| `flawless` | `mistakes === 0 && wordsFound >= target` | 8 | skill |
| `mpWin` | `isMultiplayer && isWinner` | 1 | pvp |
| `beatHuman` | `isMultiplayer && isWinner && beatHumanOpponent` | 1 | pvp |
| `playMode` | `mode === <publicMode>` | — | discovery |

- **Pool ≥ 12 quests** across families. Daily picks 3 via the existing seeded shuffle, with a **family-diversity rule** (don't serve 3 skill quests — rotate skill/pvp/discovery per research: vary *type*, not just difficulty).
- **`playMode` quests draw `href`/mode ONLY from `QUEST_PUBLIC_MODES`** = `['classic','word-hunt','multiplayer','daily','brain']`. Adventure & all beta modes excluded by construction → satisfies "don't show adventure".
- **`beatHuman` is liquidity-safe:** "beat ≥1 human opponent," not "all-human lobby" (bots pad lobbies). Same-language is automatic (matchmaking).

---

## Celebration (reuse existing tiers, map by family/rarity)

`QuestCompletionToast` already has 3 confetti tiers. Map:
- skill/discovery daily → normal confetti (`fireVictoryConfetti`).
- pvp daily (mpWin/beatHuman) → bump to a louder burst (it's the brag-worthy one).
- Grand Slam (3/3) / All-Complete → existing fireworks tiers (unchanged).
No new celebration UI. Optionally surface an in-results "Quest complete!" line (cheap), deferred to Phase 3 if time.

---

## Social proof — recent-achievements feed (Phase 2)

Research: broadcast **weekly+/rare completions only**, opt-in, rate-limited, **persistent feed** (not presence toast — at low DAU nobody's online to see a live toast).

- New table `quest_achievement_feed` (NOT in realtime publication): `id, player_id, display_name, quest_id, family, created_at`. 50-row cap / TTL.
- Write on completion of **pvp quests + Grand Slam + weekly** only (never plain daily skill — avoids spam, research rule #1).
- Privacy: `profiles.share_achievements` boolean (default ON for 18+ per release-notes age policy; toggle in settings). Honor it before insert.
- Render a **"Recent wins" strip** in QuestHub + (optionally) MP lobby: "🏆 {name} just beat a human rival" / "{name} cleared all 3 daily quests." Pull via a cached GET (Redis `lc:next`, 30–60s TTL) — no realtime, no per-write cost.

---

## Phases

1. **Engine + content (vertical slice):** repurpose `dailyQuestPool.ts` to condition-quests + family diversity; `evaluateDailyQuests` pure fn (TDD); `QuestGameResult` builder + wire at the 2 seams; rip `adventure` out of the daily/backend slot semantics; update QuestCard/QuestHub to render quest title/desc/progress + public-mode GO links; 5-lang `quests.*` copy. Celebration reuse. **Commit.**
2. **Social proof feed:** table migration, write-on-completion (pvp/grand-slam/weekly), `share_achievements` toggle, cached GET, "Recent wins" strip. **Commit.**
3. **Polish:** in-results quest-complete moment, escalating/chain framing on weekly, pvp celebration bump. **Commit.**

## Out of scope (pruned)
Battle pass, premium currency, monetization layer, friends-based "beat a friend" (no friends-in-MP-invite metadata), loot boxes, revenge/comeback quests (need per-round snapshots — Tier C), real-time presence toasts.

## Tests
- `evaluateDailyQuests` unit (TDD): each condition type true/false at boundary; family diversity in pick; **no beta mode ever returned** by `playMode` picker; beatHuman false when only bots beaten.
- Seam integration: a finished game flips the right slot exactly once (false→true), idempotent on replay.
- 5-language key presence for all `quests.*`.
