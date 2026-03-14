# Adventure Mode Phase 0 — Fix Broken Systems

> Status: COMPLETE — All 5 fixes code complete, tests passing (76 suites, 1169 tests), 0 adventure TS errors.
> Migration ready: `supabase/migrations/20260314000000_add_gold_upgrades.sql`
> Full audit: `docs/audits/adventure-mode-expert-audit.md`

## Fix 1: XP Formula Alignment ⏳ STARTED
**Problem:** API route (`app/api/adventure/complete/route.ts`) uses `N^1.5 * 100` (System A), game uses RuneScape formula from `shared/utils/adventureXpUtils.ts` (System B). At level 30: 164K vs 13K XP — 12x divergence.

**Changes:**
- [x] Add import of `getLevelFromXp` from `@/shared/utils/adventureXpUtils` to route.ts
- [x] Remove local `calculatePlayerLevel()` function (lines 86-96) from route.ts
- [x] Replace `calculatePlayerLevel(newTotalXp)` call (line 213) with `getLevelFromXp(newTotalXp)`
- [x] Remove dead XP functions from `lib/adventure/constants.ts` (lines 257-318): `getXpForLevel`, `getLevelFromXp`, `getXpProgressInLevel`, `getXpToNextLevel`
- [x] Update `constants.test.ts` to remove tests for dead XP functions

## Fix 2: Gold Persistence
**Problem:** Gold earned in-game is never saved. No DB column, no API endpoint. `useAdventureCurrency.pendingUpdate` is discarded by `useAdventureGameInit` (not in return object). `userId = 'temp-user-id'` hardcoded.

**Changes:**
- [x] Add `gold` and `upgrades` columns to `player_progression` via new migration:
  ```sql
  ALTER TABLE player_progression ADD COLUMN gold INTEGER DEFAULT 0;
  ALTER TABLE player_progression ADD COLUMN upgrades JSONB DEFAULT '{"timeBonus":0,"scoreBonus":0,"xpBonus":0}';
  ```
- [x] Add gold calculation to `/api/adventure/complete` response (mirror the in-game formula from `useAdventureLevelCompletion.ts` lines 109-111)
- [x] Update `/api/adventure/complete` to persist gold alongside XP
- [x] Update `/api/adventure/state` to return gold and upgrades
- [x] In `useAdventureGameInit.ts`: get userId from auth context instead of `'temp-user-id'`
- [x] In `useAdventureGameInit.ts`: expose `pendingUpdate` and `acknowledgePersistence` in return object (or remove since API handles persistence)
- [x] Initialize `useAdventureXp` and `useAdventureCurrency` with values from ProgressionContext

## Fix 3: Wire Boss Mechanics into Boss Fights
**Problem:** `checkBossWord` in `useAdventureBossOrchestration.ts` (line 152-159) is a simplified stub (just checks word.length >= 5). The full `useBossMechanics` hook with 10 twist mechanic evaluators exists but is unused during actual boss fights.

**Changes:**
- [x] In `useAdventureBossOrchestration.ts`: import and use `useBossMechanics` hook
- [x] Replace simplified `checkBossWord` (lines 152-159) with `useBossMechanics.checkWord()`
- [x] Wire `useBossMechanics.triggerTaunt` for mechanic-triggered taunts

**Note:** The `useBossAbilities` hook (registry-based ability system) is a separate, larger feature. The twist mechanics via `useBossMechanics` are the immediate priority since they define each boss's unique identity.

## Fix 4: Wire Flash Challenges into AdventureGame
**Problem:** `useFlashChallenge` hook is fully implemented but never imported by `AdventureGame.tsx`. `FlashChallengeToast` component exists but is never rendered.

**Changes:**
- [x] In `AdventureGame.tsx`: import `useFlashChallenge` from `@/hooks/useFlashChallenge`
- [x] Add `useFlashChallenge` call with required props: `worldId`, `totalTimeSeconds`, `timeRemaining`, `wordsFound`, `isPlaying`
- [x] Import and render `FlashChallengeToast` in the overlays section
- [x] Pass `activeChallenge`, `isChallengeComplete`, `dismiss` to toast component

## Fix 5: Quest Chapter Mapping Formula
**Problem:** `getChapterNumber()` in `questConfig.ts` uses `Math.ceil(levelNumber / 5)` but actual chapter structure is [2, 2, 3] (from `constants.ts` CHAPTER_STRUCTURE).

**Changes:**
- [x] Fix `getChapterNumber()` to match CHAPTER_STRUCTURE:
  ```typescript
  export function getChapterNumber(levelNumber: number): number {
    if (levelNumber <= 2) return 1;  // Chapter 1: levels 1-2
    if (levelNumber <= 4) return 2;  // Chapter 2: levels 3-4
    return 3;                         // Chapter 3: levels 5-7
  }
  ```

## Key Files Reference
| File | Purpose |
|------|---------|
| `app/api/adventure/complete/route.ts` | Level completion API (Fix 1, 2) |
| `app/api/adventure/state/route.ts` | State fetch API (Fix 2) |
| `shared/utils/adventureXpUtils.ts` | Canonical XP formula (System B - RuneScape) |
| `lib/adventure/constants.ts` | Dead XP functions to remove (System A) |
| `hooks/useAdventureXp.ts` | In-game XP state (uses System B) |
| `hooks/useAdventureCurrency.ts` | In-game gold state (pendingUpdate pattern) |
| `components/adventure/hooks/useAdventureGameInit.ts` | Discards pendingUpdate, hardcodes temp-user-id |
| `components/adventure/hooks/useAdventureLevelCompletion.ts` | Awards XP/gold on completion |
| `components/adventure/hooks/useAdventureBossOrchestration.ts` | Simplified checkBossWord stub (Fix 3) |
| `hooks/useBossMechanics.ts` | Full twist mechanic system (Fix 3) |
| `hooks/useBossAbilities.ts` | Registry-based ability system (future - not Phase 0) |
| `hooks/useAdventureBossNew.ts` | Simplified boss hook (random attacks) |
| `hooks/useFlashChallenge.ts` | Flash challenge hook (Fix 4) |
| `components/adventure/AdventureGame.tsx` | Main orchestrator (Fix 4) |
| `lib/adventure/questConfig.ts` | Quest config with wrong chapter mapping (Fix 5) |
| `contexts/ProgressionContext.tsx` | DB persistence for stars/completions |
