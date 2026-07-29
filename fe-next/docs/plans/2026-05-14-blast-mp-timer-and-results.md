# MP Blast — Timer Model, Bot Fix & Results Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert MP Blast from a 3-wave board-clear game into a pure fixed-timer game, fix bots going idle in Blast, and replace the Blast results UI with a single Blast-flavored animated scene.

**Architecture:** Server-side, delete the wave-advance / endGame-on-clear special case so Blast rides the shared `gameTimer.ts` countdown like every other MP mode. Board clears (now rare, because gravity refills continuously) award a bonus and regenerate the overlay in place. Bots get re-synced to the live grid on every board mutation, not just on wave advance. Client loses the wave indicator + move counter and gains a player-visible `CircularTimer`. The two existing Blast results components are replaced by one `BlastResultsScene`.

**Tech Stack:** TypeScript, Express + Socket.IO backend, Next.js 16 App Router, Zustand, framer-motion (`m` / LazyMotion), Vitest (backend) + Jest/RTL (frontend).

**Spec:** `fe-next/docs/specs/2026-05-14-blast-mp-timer-and-results-design.md`

---

## File Structure

**Server — modify**
- `fe-next/shared/constants/blastMultiplayerConstants.ts` — remove `BLAST_MP_DEFAULT_MAX_WAVES`.
- `fe-next/backend/handlers/gameStartHandler.ts` — remove Blast timer force-override; fall back to `BLAST_MP_DEFAULT_TIMER`.
- `fe-next/backend/modules/blastModeManager.ts` — replace `advanceBlastWave` with `regenerateBlastBoard`; add `boardClears` to `BlastPlayerStats`; add `recordBlastBoardClear`.
- `fe-next/backend/handlers/wordValidationHandler.ts` — replace wave-advance block with regenerate-in-place; flip gravity `refill` to `true`.
- `fe-next/backend/services/gameLifecycle/botGame.ts` — mirror the regenerate-in-place change in the bot callback; resync bots after every `blastBoardUpdate`.

**Server — test**
- `fe-next/backend/handlers/__tests__/wordValidationHandler.blast.test.ts` — new/updated: timer-era behaviour.
- `fe-next/backend/services/gameLifecycle/__tests__/botGame.blast.test.ts` — update: drop wave-advance tests, add resync + idle-bug regression.

**Client — modify**
- `fe-next/host/components/tv-broadcast/TvGameHeader.tsx` — remove wave badge.
- `fe-next/player/hooks/socket/usePlayerGameEvents.ts` — collapse `blastWaveAdvance` handling into `blastBoardUpdate`.
- `fe-next/components/game/BlastGame.tsx` — render `CircularTimer` from `remainingTime` / `totalTime`.
- `fe-next/hooks/gameState/store.ts` + `storeTypes.ts` — remove `blastWave`, `blastMovesUsed`; add `blastBoardClears`.
- `fe-next/hooks/gameState/selectors.ts` — drop `useBlastMovesUsed`; add `useBlastBoardClears`.
- `fe-next/components/views/ResultsPage.tsx` — swap both Blast result components for `BlastResultsScene`.

**Client — create**
- `fe-next/components/results/BlastResultsScene.tsx` — new unified Blast results component.
- `fe-next/components/results/__tests__/BlastResultsScene.test.tsx` — new tests.

**Client — delete**
- `fe-next/components/results/BlastBoardDomination.tsx`
- `fe-next/components/results/BlastResultsSummary.tsx`
- `fe-next/components/game/BlastMoveCounter.tsx`

**i18n — modify**
- `fe-next/translations/{en,he,sv,ja,es}.js` (or `.ts`) — Blast results keys; remove `blast.multiplayer.moves` / `bonusMove` if unused elsewhere.

---

## PHASE 1 — Server: pure timer, no waves

### Task 1: Blast respects host timer setting

**Files:**
- Modify: `fe-next/backend/handlers/gameStartHandler.ts:300-306`
- Modify: `fe-next/backend/handlers/gameStartHandler.ts:267`
- Test: `fe-next/backend/handlers/__tests__/gameStartHandler.test.ts` (existing)

- [ ] **Step 1: Write the failing test**

Add to `gameStartHandler.test.ts`:

```typescript
describe('Blast timer', () => {
  it('uses host-supplied timer for Blast instead of force-overriding to 90s', async () => {
    const { game, socket } = setupBlastStartScenario({ timerSeconds: 180 });
    await startGameHandler(socket, { timerSeconds: 180, gameMode: 'blast' });
    expect(game.timerSeconds).toBe(180);
  });

  it('falls back to BLAST_MP_DEFAULT_TIMER (90) when no timer supplied for Blast', async () => {
    const { game, socket } = setupBlastStartScenario({ timerSeconds: undefined });
    await startGameHandler(socket, { gameMode: 'blast' });
    expect(game.timerSeconds).toBe(90);
  });
});
```

> If `setupBlastStartScenario` does not exist, model it on the existing start-game test helpers in the same file — create a host user with `blast_access`, a game in `waiting` state, and a mock socket.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:backend -- gameStartHandler`
Expected: FAIL — first test gets `90`, second may pass or fail depending on payload default.

- [ ] **Step 3: Remove the force-override, add Blast-specific fallback**

In `gameStartHandler.ts`, change line 267 from:

```typescript
let validTimer = Math.max(30, Math.min(600, parseInt(String(timerSeconds), 10) || 120));
```

to:

```typescript
const rawTimer = parseInt(String(timerSeconds), 10);
```

Then **delete** lines 300-306 entirely (the `if (resolvedMode === 'blast') { validTimer = BLAST_MP_DEFAULT_TIMER; }` block and its comment). Immediately after `resolvedMode` is assigned (currently line 298), insert:

```typescript
    // Timer: clamp host choice to the safe range. Blast falls back to its own
    // 90s default (not the generic 120) when the host supplied nothing — but a
    // host-chosen 1/2/3 min is now respected (was force-overridden, audit SRV-M4;
    // override accepted by product 2026-05-14 — waves removed, fixed-window
    // balance argument no longer holds).
    const timerFallback = resolvedMode === 'blast' ? BLAST_MP_DEFAULT_TIMER : 120;
    let validTimer = Math.max(30, Math.min(600, rawTimer || timerFallback));
```

Confirm `BLAST_MP_DEFAULT_TIMER` is imported from `@/shared/constants/gameConstants` at the top of the file; add the import if missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:backend -- gameStartHandler`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe-next/backend/handlers/gameStartHandler.ts fe-next/backend/handlers/__tests__/gameStartHandler.test.ts
git commit -m "feat(blast): MP Blast respects host timer setting, 90s fallback"
```

---

### Task 2: `regenerateBlastBoard` + `boardClears` stat

**Files:**
- Modify: `fe-next/backend/modules/blastModeManager.ts:176-308`
- Modify: `fe-next/shared/types/game.ts` (`BlastPlayerStats` type)
- Test: `fe-next/backend/modules/__tests__/blastModeManager.test.ts` (existing)

- [ ] **Step 1: Write the failing test**

Add to `blastModeManager.test.ts`:

```typescript
describe('regenerateBlastBoard', () => {
  it('produces a fresh overlay without incrementing a wave counter', () => {
    const grid = [['a', 'b'], ['c', 'd']];
    const state = initBlastModeState(grid, ['alice'], 1, 12345);
    state.refillCount = 0;
    const next = regenerateBlastBoard(state, 'ROOM1', grid);
    expect(next.refillCount).toBe(1);
    expect(next.overlay).toBeDefined();
    expect(next.tileStates.some((row) => row.some((t) => !t.isCleared))).toBe(true);
  });

  it('preserves cumulative playerStats across regeneration', () => {
    const grid = [['a', 'b'], ['c', 'd']];
    const state = initBlastModeState(grid, ['alice'], 1, 1);
    state.playerStats.alice = { maxCombo: 4, gemsCollected: 2, wordsFound: ['cab'], bestWord: 'cab', tilesCleared: 3, totalTileBonus: 5, boardClears: 0 };
    const next = regenerateBlastBoard(state, 'ROOM1', grid);
    expect(next.playerStats.alice.maxCombo).toBe(4);
    expect(next.playerStats.alice.tilesCleared).toBe(3);
  });
});

describe('recordBlastBoardClear', () => {
  it('increments boardClears for the clearing player', () => {
    const grid = [['a', 'b'], ['c', 'd']];
    const state = initBlastModeState(grid, ['alice'], 1, 1);
    recordBlastBoardClear(state, 'alice');
    recordBlastBoardClear(state, 'alice');
    expect(state.playerStats.alice.boardClears).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:backend -- blastModeManager`
Expected: FAIL — `regenerateBlastBoard` / `recordBlastBoardClear` not exported.

- [ ] **Step 3: Add `boardClears` to the type**

In `fe-next/shared/types/game.ts`, find the `BlastPlayerStats` interface and add:

```typescript
  boardClears: number;
```

Then update the lazy initializer in `blastModeManager.ts:206` from:

```typescript
    state.playerStats[username] = { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 };
```

to:

```typescript
    state.playerStats[username] = { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0, boardClears: 0 };
```

Also add an optional `refillCount?: number` field to the `BlastModeState` type in `game.ts` if not present.

- [ ] **Step 4: Replace `advanceBlastWave` with `regenerateBlastBoard` + add `recordBlastBoardClear`**

In `blastModeManager.ts`, replace the `advanceBlastWave` function (lines 296-308) with:

```typescript
/**
 * Regenerate the blast board in place (pure; caller applies via Object.assign).
 * Used when a board is fully cleared mid-timer: fresh overlay + tileStates, no
 * wave concept. Preserves cumulative playerStats. Seed is derived deterministically
 * from gameCode + refillCount so all peers reproduce the same board.
 */
export function regenerateBlastBoard(
  state: BlastModeState,
  gameCode: string,
  grid: string[][],
): BlastModeState {
  const refillCount = (state.refillCount ?? 0) + 1;
  const overlaySeed = hashStringToSeed(`${gameCode}:refill${refillCount}`);
  const players = Object.keys(state.playerStats);
  const fresh = initBlastModeState(grid, players, 1, overlaySeed);
  fresh.playerStats = state.playerStats; // preserve cumulative stats
  fresh.refillCount = refillCount;
  return fresh;
}

/**
 * Record that `username` fully cleared the board (timer-era bonus event).
 */
export function recordBlastBoardClear(state: BlastModeState, username: string): void {
  if (!state.playerStats[username]) {
    state.playerStats[username] = { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0, boardClears: 0 };
  }
  state.playerStats[username].boardClears = (state.playerStats[username].boardClears ?? 0) + 1;
}
```

Keep `isBlastBoardCleared` unchanged. `initBlastModeState` still takes a `wave` arg — pass `1` always; it is now an inert default.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:backend -- blastModeManager`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fe-next/backend/modules/blastModeManager.ts fe-next/shared/types/game.ts fe-next/backend/modules/__tests__/blastModeManager.test.ts
git commit -m "feat(blast): add regenerateBlastBoard + boardClears stat, retire advanceBlastWave"
```

---

### Task 3: `wordValidationHandler` — regenerate-in-place on board clear

**Files:**
- Modify: `fe-next/backend/handlers/wordValidationHandler.ts:117-212`
- Test: `fe-next/backend/handlers/__tests__/wordValidationHandler.blast.test.ts`

- [ ] **Step 1: Write the failing test**

Create/extend `wordValidationHandler.blast.test.ts`:

```typescript
describe('Blast board clear — timer era', () => {
  it('regenerates the board in place on full clear, does NOT end the game', async () => {
    const { game, io } = setupBlastGameNearClear(); // board where one more word clears it
    await submitWordForBlast(io, game, 'alice', 'cab');
    expect(game.gameState).toBe('in-progress');          // game still running
    expect(game.blastModeState.refillCount).toBe(1);     // board regenerated
    expect(isBlastBoardCleared(game.blastModeState.tileStates)).toBe(false); // fresh tiles
  });

  it('credits a board-clear to the clearing player', async () => {
    const { game, io } = setupBlastGameNearClear();
    await submitWordForBlast(io, game, 'alice', 'cab');
    expect(game.blastModeState.playerStats.alice.boardClears).toBe(1);
  });

  it('never schedules endGame on board clear', async () => {
    const { game, io, endGameSpy } = setupBlastGameNearClear();
    await submitWordForBlast(io, game, 'alice', 'cab');
    expect(endGameSpy).not.toHaveBeenCalled();
  });
});
```

> Reuse existing Blast handler test helpers in the file. `setupBlastGameNearClear` should build a small grid + tileStates where every tile except the word path is already `isCleared: true`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:backend -- wordValidationHandler.blast`
Expected: FAIL — current code advances waves / schedules endGame.

- [ ] **Step 3: Flip gravity refill to continuous**

In `wordValidationHandler.ts`, the `computeGravityResult` call at lines 118-128 passes `false` as the last (`refill`) arg. Change that final argument from `false` to `true` and update the comment:

```typescript
        // 2. Apply gravity WITH refill — timer-era Blast keeps the board alive
        // for the whole countdown; tiles cascade and refill continuously.
        const gravityResult = computeGravityResult(
          blastState.grid,
          processResult.next,
          gridSize,
          (game.language || 'en') as import('@/shared/types').Language,
          BLAST_SPECIAL_TILE_CHANCE,
          undefined,
          0,
          rng,
          true, // refill=true: continuous board for fixed-timer play
        );
```

- [ ] **Step 4: Replace the wave-advance block with regenerate-in-place**

Replace lines 144-212 (the `if (isBlastBoardCleared(...) && tryBeginWaveAdvance(...))` block, from the `// 5. MP board-clear` comment through its closing `}`) with:

```typescript
        // 5. MP board-clear (timer era): rare with refill on, but if a player
        // fully clears the board, award a clear-bonus, regenerate overlay in
        // place, and keep playing. The game ends ONLY on the shared timer.
        if (isBlastBoardCleared(gravityResult.newTileStates) && tryBeginWaveAdvance(gameCode)) {
          try {
            recordBlastBoardClear(blastState, username);
            const next = regenerateBlastBoard(blastState, gameCode, gravityResult.newGrid);
            Object.assign(blastState, {
              overlay: next.overlay,
              overlayMap: next.overlayMap,
              tileStates: next.tileStates,
              seed: next.seed,
              grid: next.grid,
              refillCount: next.refillCount,
            });
            const nextGrid = next.grid ?? gravityResult.newGrid;
            game.letterGrid = nextGrid;
            game.letterPositions = makePositionsMap(nextGrid, (game.language || 'en'));
            logger.info('BLAST', `Board cleared in ${gameCode} by ${username} — regenerating board (refill #${next.refillCount})`);
            broadcastToRoom(io, getGameRoom(gameCode), 'blastBoardUpdate', {
              grid: nextGrid,
              tileStates: next.tileStates,
              overlay: next.overlay,
              seed: next.seed,
              clearedBy: '__board_regenerated__',
              word: '',
              clearedCount: 0,
              totalMoves: blastState.totalMoves ?? 0,
            });
            void resyncBotsForNewGrid(
              getGameBots(gameCode),
              nextGrid,
              (game.language || 'en') as import('@/shared/types').Language,
            );
          } finally {
            endWaveAdvance(gameCode);
          }
        }
```

Update imports in `wordValidationHandler.ts`: remove `advanceBlastWave`, `BLAST_MP_DEFAULT_MAX_WAVES`, `getWaveConfig` if now unused; add `regenerateBlastBoard`, `recordBlastBoardClear`. Leave `tryBeginWaveAdvance` / `endWaveAdvance` — they still guard concurrent clears.

> Note: the `blastBoardUpdate` payload now optionally carries `overlay` + `seed` (only on a regenerate). The client handler in Task 11 reads these.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:backend -- wordValidationHandler.blast`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fe-next/backend/handlers/wordValidationHandler.ts fe-next/backend/handlers/__tests__/wordValidationHandler.blast.test.ts
git commit -m "feat(blast): regenerate board in place on clear, never end game on clear"
```

---

### Task 4: `botGame.ts` — mirror regenerate-in-place + resync on every board mutation

**Files:**
- Modify: `fe-next/backend/services/gameLifecycle/botGame.ts:226-349`
- Test: `fe-next/backend/services/gameLifecycle/__tests__/botGame.blast.test.ts`

- [ ] **Step 1: Update the test file — drop wave tests, assert regenerate**

In `botGame.blast.test.ts`, delete tests asserting `blastWaveAdvance` broadcasts / wave increments / final-wave `endGame`. Add:

```typescript
it('regenerates the board in place when a bot clears it — no endGame', async () => {
  const { game, io, endGameSpy } = setupBlastBotGameNearClear();
  await runBotSubmission(game, 'bot1', 'cab'); // clears board
  expect(game.gameState).toBe('in-progress');
  expect(game.blastModeState.refillCount).toBe(1);
  expect(endGameSpy).not.toHaveBeenCalled();
});

it('resyncs bots to the regenerated grid', async () => {
  const { game, resyncSpy } = setupBlastBotGameNearClear();
  await runBotSubmission(game, 'bot1', 'cab');
  expect(resyncSpy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:backend -- botGame.blast`
Expected: FAIL — bot callback still advances waves.

- [ ] **Step 3: Replace the bot callback's wave-advance block**

In `botGame.ts`, replace lines 278-344 (the `// MP board-clear parity` comment through the matching closing braces of the `if (isBlastBoardCleared(...))` block) with:

```typescript
              // MP board-clear parity with human path: regenerate in place,
              // never end the game on clear (timer-era Blast).
              if (isBlastBoardCleared(gravityResult.newTileStates) && tryBeginWaveAdvance(gameCode)) {
                try {
                  recordBlastBoardClear(blastState, username);
                  const next = regenerateBlastBoard(blastState, gameCode, gravityResult.newGrid);
                  const nextGrid = next.grid ?? gravityResult.newGrid;
                  Object.assign(blastState, {
                    overlay: next.overlay,
                    overlayMap: next.overlayMap,
                    tileStates: next.tileStates,
                    seed: next.seed,
                    grid: nextGrid,
                    refillCount: next.refillCount,
                  });
                  if (currentGame) {
                    currentGame.letterGrid = nextGrid;
                    currentGame.letterPositions = makePositionsMap(nextGrid, (currentGame.language || 'en'));
                  }
                  logger.info('BLAST', `Board cleared in ${gameCode} by bot ${username} — regenerating board (refill #${next.refillCount})`);
                  broadcastToRoom(io, getGameRoom(gameCode), 'blastBoardUpdate', {
                    grid: nextGrid,
                    tileStates: next.tileStates,
                    overlay: next.overlay,
                    seed: next.seed,
                    clearedBy: '__board_regenerated__',
                    word: '',
                    clearedCount: 0,
                    totalMoves: blastState.totalMoves ?? 0,
                  });
                  void botManager.resyncBotsForNewGrid(
                    botManager.getGameBots(gameCode),
                    nextGrid,
                    language,
                  );
                } finally {
                  endWaveAdvance(gameCode);
                }
              }
```

Then, immediately AFTER the `broadcastToRoom(... 'blastBoardUpdate' ...)` call at lines 269-276 (the *normal* per-word broadcast, not the regenerate one), add a resync so bots track the mutated grid every move:

```typescript
              // Bots' word pools are computed from the grid snapshot; Blast
              // mutates the grid every word, so resync after each board update
              // or bots run dry and go idle (idle-bot bug, see Phase 2).
              void botManager.resyncBotsForNewGrid(
                botManager.getGameBots(gameCode),
                gravityResult.newGrid,
                language,
              );
```

Update imports in `botGame.ts`: remove `advanceBlastWave`, `BLAST_MP_DEFAULT_MAX_WAVES`, `getWaveConfig`, `stopAllBots` (if now unused); add `regenerateBlastBoard`, `recordBlastBoardClear`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:backend -- botGame.blast`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe-next/backend/services/gameLifecycle/botGame.ts fe-next/backend/services/gameLifecycle/__tests__/botGame.blast.test.ts
git commit -m "feat(blast): bots regenerate board in place + resync on every board update"
```

---

### Task 5: Remove `BLAST_MP_DEFAULT_MAX_WAVES`

**Files:**
- Modify: `fe-next/shared/constants/blastMultiplayerConstants.ts:11-15`

- [ ] **Step 1: Delete the constant**

Remove lines 11-15 (the doc comment + `export const BLAST_MP_DEFAULT_MAX_WAVES = 3;`).

- [ ] **Step 2: Verify nothing else imports it**

Run: `grep -rn "BLAST_MP_DEFAULT_MAX_WAVES" fe-next/`
Expected: no results (Tasks 3 and 4 removed the consumers).

- [ ] **Step 3: Type-check + backend tests**

Run: `npm run test:backend -- blast && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add fe-next/shared/constants/blastMultiplayerConstants.ts
git commit -m "chore(blast): remove unused BLAST_MP_DEFAULT_MAX_WAVES"
```

---

## PHASE 2 — Bot idle bug

> Hypothesis (strongest, from exploration): bots' word pools are computed from a grid snapshot at `startBot` time. Blast mutates the grid every word; bots only re-synced on wave-advance, so between clears they exhaust valid words and go idle. Task 4 already adds per-update resync — Phase 2 *confirms* that is the root cause (vs. score-cap zeroing) and locks it with a regression test. Do NOT skip the reproduction step: if the repro shows bots emit words but get zeroed by `shouldBotScore`, the fix is different and lives in `shouldBotScore`, not resync.

### Task 6: Reproduce — diagnostic test separating "not emitting" from "emitting but zeroed"

**Files:**
- Test: `fe-next/backend/services/gameLifecycle/__tests__/botGame.blast.test.ts`

- [ ] **Step 1: Write the diagnostic regression test**

```typescript
describe('Blast bot liveness (idle-bug regression)', () => {
  it('bots emit words AND receive credited score across a full Blast game', async () => {
    const { game, io } = setupBlastBotGame({ bots: 2, durationSeconds: 30 });
    const emitted: string[] = [];
    const credited: number[] = [];
    instrumentBotSubmissions(game, (word, creditedScore) => {
      emitted.push(word);
      credited.push(creditedScore);
    });

    await advanceBlastGame(game, io, { seconds: 30 }); // simulate full timer

    // H1 check — bots actually emit words
    expect(emitted.length).toBeGreaterThan(3);
    // H2 check — at least some emissions are credited > 0
    expect(credited.some((c) => c > 0)).toBe(true);
  });
});
```

> `instrumentBotSubmissions` wraps the bot submission callback to capture `(word, totalScore credited after shouldBotScore)`. If the existing test harness has no such hook, add a lightweight one in the test file — patch `botManager.startBot` via `vi.spyOn` to intercept the callback. `advanceBlastGame` should drive the fake timer (`vi.advanceTimersByTime`) so bot timeouts fire.

- [ ] **Step 2: Run the test — observe which assertion fails**

Run: `npm run test:backend -- botGame.blast -t "idle-bug"`
Expected (pre-fix, if Task 4 not yet applied): `emitted.length` is low → confirms H1 (bots stop emitting). If `emitted.length` is fine but `credited` is all 0 → H2, stop and re-plan the fix around `shouldBotScore`.

- [ ] **Step 3: Confirm Task 4's resync fixes it**

With Task 4 applied, re-run. Expected: PASS — bots keep emitting because they re-sync to the live grid every board update.

> If it still fails on H1 after Task 4: the pool is stale for a reason other than grid drift — check `resyncBotsForNewGrid` actually rebuilds the pool (grep its body) and that `getGameBots(gameCode)` returns the live bots. Fix the actual cause; do not weaken the test.

- [ ] **Step 4: Commit**

```bash
git add fe-next/backend/services/gameLifecycle/__tests__/botGame.blast.test.ts
git commit -m "test(blast): regression test for idle-bot bug — bots emit and score in Blast"
```

---

## PHASE 3 — Results redesign

### Task 7: Store + selector — `blastBoardClears`, drop `blastMovesUsed`

**Files:**
- Modify: `fe-next/hooks/gameState/store.ts:57-67` and `:319-357`
- Modify: `fe-next/hooks/gameState/storeTypes.ts`
- Modify: `fe-next/hooks/gameState/selectors.ts:57-64`
- Test: `fe-next/hooks/gameState/__tests__/selectors.test.ts` (existing) or create

- [ ] **Step 1: Write the failing test**

Add to the selectors test file:

```typescript
it('useBlastBoardClears reads blastBoardClears from the store', () => {
  useGameStore.setState({ blastBoardClears: 3 });
  const { result } = renderHook(() => useBlastBoardClears());
  expect(result.current).toBe(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- selectors`
Expected: FAIL — `useBlastBoardClears` not exported.

- [ ] **Step 3: Update store + types + selectors**

In `store.ts` initialState (lines 57-67): remove `blastMovesUsed: 0,` and `blastWave: 1,`; add `blastBoardClears: 0,`.
In `store.ts` actions (lines 319-357): remove `setBlastMovesUsed` and `setBlastWave`; add:

```typescript
  setBlastBoardClears: (n: number) => set({ blastBoardClears: n }),
```

In `storeTypes.ts`: in `GameState` remove `blastMovesUsed` + `blastWave`, add `blastBoardClears: number;`. In `GameActions` remove `setBlastMovesUsed` + `setBlastWave`, add `setBlastBoardClears: (n: number) => void;`.

In `selectors.ts` (lines 57-64): remove `useBlastMovesUsed`; add:

```typescript
export const useBlastBoardClears = (): number => useGameStore((state) => state.blastBoardClears);
```

> `grep -rn "useBlastMovesUsed\|setBlastMovesUsed\|blastMovesUsed\|setBlastWave\|useBlastWave\|blastWave" fe-next/` — every hit outside Tasks 8-12 scope must be cleaned here. Known hits: `ResultsPage.tsx` (Task 10), `TvGameHeader.tsx` (Task 12), `usePlayerGameEvents.ts` (Task 11), `BlastResultsSummary.tsx`/`BlastMoveCounter.tsx` (deleted Task 12).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- selectors`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/gameState/store.ts fe-next/hooks/gameState/storeTypes.ts fe-next/hooks/gameState/selectors.ts fe-next/hooks/gameState/__tests__/selectors.test.ts
git commit -m "feat(blast): store tracks blastBoardClears, drops blastMovesUsed/blastWave"
```

---

### Task 8: i18n keys for `BlastResultsScene`

**Files:**
- Modify: `fe-next/translations/en.js` (+ `he.js`, `sv.js`, `ja.js`, `es.js`)

- [ ] **Step 1: Add the English keys**

Under the existing `blast.results` object in `en.js`, add (keep existing keys; add only what's missing):

```javascript
      sceneTitle: 'Blast Results',
      finalScore: 'Final Score',
      comboChain: 'Best Combo',
      boardClears: 'Board Clears',
      gemsCollected: 'Gems',
      tilesCleared: 'Tiles Cleared',
      bestWord: 'Best Word',
      rank: 'Rank',
```

- [ ] **Step 2: Add the same keys to `he.js`, `sv.js`, `ja.js`, `es.js`**

Use AI translations (project norm — native review pending). Hebrew (RTL):

```javascript
      sceneTitle: 'תוצאות בלאסט',
      finalScore: 'ניקוד סופי',
      comboChain: 'קומבו שיא',
      boardClears: 'ניקוי לוחות',
      gemsCollected: 'אבני חן',
      tilesCleared: 'אריחים שנוקו',
      bestWord: 'המילה הטובה ביותר',
      rank: 'דירוג',
```

Swedish:

```javascript
      sceneTitle: 'Blast-resultat',
      finalScore: 'Slutpoäng',
      comboChain: 'Bästa combo',
      boardClears: 'Brädesrensningar',
      gemsCollected: 'Ädelstenar',
      tilesCleared: 'Rensade rutor',
      bestWord: 'Bästa ord',
      rank: 'Placering',
```

Japanese:

```javascript
      sceneTitle: 'ブラスト結果',
      finalScore: '最終スコア',
      comboChain: '最高コンボ',
      boardClears: 'ボードクリア',
      gemsCollected: 'ジェム',
      tilesCleared: 'クリアタイル',
      bestWord: 'ベストワード',
      rank: 'ランク',
```

Spanish:

```javascript
      sceneTitle: 'Resultados de Blast',
      finalScore: 'Puntuación final',
      comboChain: 'Mejor combo',
      boardClears: 'Tableros despejados',
      gemsCollected: 'Gemas',
      tilesCleared: 'Fichas despejadas',
      bestWord: 'Mejor palabra',
      rank: 'Posición',
```

- [ ] **Step 3: Verify the translation files parse**

Run: `npm run lint -- fe-next/translations`
Expected: no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add fe-next/translations/en.js fe-next/translations/he.js fe-next/translations/sv.js fe-next/translations/ja.js fe-next/translations/es.js
git commit -m "i18n(blast): add BlastResultsScene keys (HE/SV/JA/ES native review pending)"
```

---

### Task 9: Create `BlastResultsScene` component

**Files:**
- Create: `fe-next/components/results/BlastResultsScene.tsx`
- Test: `fe-next/components/results/__tests__/BlastResultsScene.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `BlastResultsScene.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import BlastResultsScene from '../BlastResultsScene';
import type { BlastPlayerStats } from '@/shared/types/game';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const stats = (over: Partial<BlastPlayerStats>): BlastPlayerStats => ({
  maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '',
  tilesCleared: 0, totalTileBonus: 0, boardClears: 0, ...over,
});

describe('BlastResultsScene', () => {
  const playerStats: Record<string, BlastPlayerStats> = {
    alice: stats({ maxCombo: 5, gemsCollected: 8, tilesCleared: 40, bestWord: 'BLASTER', boardClears: 2 }),
    bob: stats({ maxCombo: 3, gemsCollected: 4, tilesCleared: 22, bestWord: 'WORD', boardClears: 0 }),
  };
  const scores = { alice: 1200, bob: 800 };

  it('renders every player with their final score', () => {
    render(<BlastResultsScene playerStats={playerStats} scores={scores} currentUsername="alice" />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('ranks the higher score first', () => {
    render(<BlastResultsScene playerStats={playerStats} scores={scores} currentUsername="bob" />);
    const rows = screen.getAllByTestId('blast-result-row');
    expect(rows[0]).toHaveTextContent('alice');
    expect(rows[1]).toHaveTextContent('bob');
  });

  it('surfaces best combo, gems, board clears and best word', () => {
    render(<BlastResultsScene playerStats={playerStats} scores={scores} currentUsername="alice" />);
    expect(screen.getByText('BLASTER')).toBeInTheDocument();
    expect(screen.getByText(/blast\.results\.boardClears/)).toBeInTheDocument();
  });

  it('renders without animation wrappers when reduced motion is preferred', () => {
    jest.spyOn(require('framer-motion'), 'useReducedMotion').mockReturnValue(true);
    const { container } = render(<BlastResultsScene playerStats={playerStats} scores={scores} currentUsername="alice" />);
    expect(container).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- BlastResultsScene`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

Create `fe-next/components/results/BlastResultsScene.tsx`:

```tsx
'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Bomb, Crown, Flame, Gem, Grid3x3, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import type { BlastPlayerStats } from '@/shared/types/game';

interface BlastResultsSceneProps {
  playerStats: Record<string, BlastPlayerStats>;
  scores: Record<string, number>;
  currentUsername?: string;
}

const PLAYER_ACCENTS = [
  { text: 'text-neo-lime', border: 'border-neo-lime', glow: 'shadow-[0_0_14px_rgba(191,255,0,0.45)]' },
  { text: 'text-neo-pink', border: 'border-neo-pink', glow: 'shadow-[0_0_14px_rgba(255,20,147,0.45)]' },
  { text: 'text-neo-cyan', border: 'border-neo-cyan', glow: 'shadow-[0_0_14px_rgba(0,255,255,0.45)]' },
  { text: 'text-neo-purple', border: 'border-neo-purple', glow: 'shadow-[0_0_14px_rgba(139,92,246,0.45)]' },
  { text: 'text-neo-yellow', border: 'border-neo-yellow', glow: 'shadow-[0_0_14px_rgba(250,204,21,0.45)]' },
  { text: 'text-neo-red', border: 'border-neo-red', glow: 'shadow-[0_0_14px_rgba(255,51,102,0.45)]' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const row = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};
const reduced = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };

function StatChip({ icon, value, label, accent }: {
  icon: React.ReactNode; value: React.ReactNode; label: string; accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`flex items-center gap-1 ${accent}`}>{icon}
        <span className="text-sm font-black tabular-nums">{value}</span>
      </span>
      <span className="text-[9px] uppercase tracking-wider text-neo-cream/50">{label}</span>
    </div>
  );
}

export default function BlastResultsScene({ playerStats, scores, currentUsername }: BlastResultsSceneProps) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();
  const v = prefersReduced ? reduced : row;

  const ranked = useMemo(() => {
    return Object.keys(playerStats)
      .map((username) => ({ username, stats: playerStats[username], score: scores[username] ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [playerStats, scores]);

  if (ranked.length === 0) return null;

  const accentFor = (i: number) => PLAYER_ACCENTS[i % PLAYER_ACCENTS.length];

  return (
    <m.div variants={container} initial="hidden" animate="show" className="space-y-3">
      {/* Header */}
      <m.div variants={v} className="flex items-center gap-2 px-1">
        <Bomb className="w-5 h-5 text-neo-lime" />
        <h3 className="text-sm font-black uppercase tracking-wider text-neo-cream/80">
          {t('blast.results.sceneTitle')}
        </h3>
      </m.div>

      {/* Ranked player rows */}
      <div className="space-y-2">
        {ranked.map(({ username, stats, score }, idx) => {
          const accent = accentFor(idx);
          const isMe = username === currentUsername;
          return (
            <m.div
              key={username}
              variants={v}
              data-testid="blast-result-row"
              className={`relative overflow-hidden p-3 rounded-neo border-3 border-neo-black shadow-hard bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy ${idx === 0 ? accent.glow : ''} ${isMe ? `border-l-4 ${accent.border}` : ''}`}
            >
              {/* Cascade-themed ambient glow on the leader */}
              {idx === 0 && !prefersReduced && (
                <m.div
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-br from-neo-pink/10 via-neo-orange/10 to-neo-lime/10 pointer-events-none"
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <div className="relative">
                {/* Name + final score */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {idx === 0 && <Crown className="w-4 h-4 text-neo-yellow shrink-0" />}
                    <span className={`text-sm font-bold truncate ${isMe ? 'text-neo-white' : 'text-neo-cream/80'}`}>
                      {username}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-2xl font-black tabular-nums leading-none ${accent.text}`}>
                      <ScoreCountUp to={score} duration={1300} delay={prefersReduced ? 0 : 300 + idx * 120} />
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neo-cream/50">
                      {t('blast.results.finalScore')}
                    </span>
                  </div>
                </div>
                {/* Blast-specific stat chips */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t-2 border-neo-black/40">
                  <StatChip icon={<Flame className="w-3 h-3" />} value={`${stats.maxCombo}x`} label={t('blast.results.comboChain')} accent="text-neo-orange" />
                  <StatChip icon={<Gem className="w-3 h-3" />} value={stats.gemsCollected} label={t('blast.results.gemsCollected')} accent="text-neo-cyan" />
                  <StatChip icon={<Bomb className="w-3 h-3" />} value={stats.tilesCleared} label={t('blast.results.tilesCleared')} accent="text-neo-lime" />
                  <StatChip icon={<Grid3x3 className="w-3 h-3" />} value={stats.boardClears} label={t('blast.results.boardClears')} accent="text-neo-purple" />
                </div>
                {/* Best word */}
                {stats.bestWord && (
                  <div className="mt-2 flex items-center gap-1.5 justify-center">
                    <Trophy className="w-3.5 h-3.5 text-neo-yellow" />
                    <span className="text-[10px] uppercase tracking-wider text-neo-cream/50">
                      {t('blast.results.bestWord')}:
                    </span>
                    <span className="font-bold text-neo-white text-sm uppercase">{stats.bestWord}</span>
                  </div>
                )}
              </div>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
}
```

> Animation note: this uses the project's `m` (LazyMotion) + `useReducedMotion` pattern already established in `BlastBoardDomination`. The `/animate-ai` skill may be invoked during a polish pass to enrich the cascade fx, but the component must ship working with this baseline first.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- BlastResultsScene`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/results/BlastResultsScene.tsx fe-next/components/results/__tests__/BlastResultsScene.test.tsx
git commit -m "feat(blast): add unified BlastResultsScene results component"
```

---

### Task 10: Wire `BlastResultsScene` into `ResultsPage`, remove old components' usage

**Files:**
- Modify: `fe-next/components/views/ResultsPage.tsx:49`, `:176-189`, `:302-305`

- [ ] **Step 1: Update imports**

In `ResultsPage.tsx`, remove the imports of `BlastBoardDomination` and `BlastResultsSummary`; add:

```tsx
import BlastResultsScene from '@/components/results/BlastResultsScene';
```

In the selector imports (line 49 area), remove `useBlastMovesUsed`; ensure `useBlastPlayerStats` is still imported. The component needs per-player scores — `ResultsPage` already has the match scores map (the same data the podium uses); identify that variable (e.g. `playerScores` / `scores`). If no such map is in scope, derive it from the existing results data already passed to `ResultsMainContent`.

- [ ] **Step 2: Replace the Blast render block**

Replace lines 176-189 (the `{resolvedGameMode === 'blast' && ( ... )}` block) with:

```tsx
            {resolvedGameMode === 'blast' && Object.keys(blastPlayerStats).length > 0 && (
              <BlastResultsScene
                playerStats={blastPlayerStats}
                scores={blastResultScores}
                currentUsername={username}
              />
            )}
```

Where `blastResultScores` is the per-username score map identified in Step 1. Add a `const blastResultScores = ...` near the other Blast hook calls (lines 302-305) if it needs deriving.

- [ ] **Step 3: Remove now-dead hook calls**

At lines 302-305, remove `const blastMovesUsed = useBlastMovesUsed();`, `const blastTotalTileBonus = ...;`, `const blastTotalTilesCleared = ...;` IF they are no longer referenced anywhere else in the file. Keep `blastPlayerStats`. Run `grep -n "blastMovesUsed\|blastTotalTileBonus\|blastTotalTilesCleared" fe-next/components/views/ResultsPage.tsx` to confirm.

- [ ] **Step 4: Type-check + run ResultsPage tests**

Run: `npx tsc --noEmit && npm run test:frontend -- ResultsPage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/views/ResultsPage.tsx
git commit -m "feat(blast): ResultsPage uses BlastResultsScene, drops old Blast result cards"
```

---

### Task 11: Collapse `blastWaveAdvance` into `blastBoardUpdate` on the client

**Files:**
- Modify: `fe-next/player/hooks/socket/usePlayerGameEvents.ts:740-761`, `:828-829`, `:874-875`

- [ ] **Step 1: Update the `blastBoardUpdate` handler to apply optional overlay/seed**

Replace the `handleBlastBoardUpdate` (lines 740-743) with:

```tsx
  const handleBlastBoardUpdate = (data: {
    grid: string[][]; tileStates: BlastTileState[][]; clearedBy: string;
    word: string; clearedCount: number; totalMoves: number;
    overlay?: BlastTileOverlay[]; seed?: number;
  }) => {
    logger.log('[PLAYER] Blast board update from', data.clearedBy, '- word:', data.word, 'cleared:', data.clearedCount);
    // A full board-clear regenerates the overlay server-side; apply it so the
    // client board stays in lock-step. Regular per-word updates omit overlay/seed.
    if (data.overlay && typeof data.seed === 'number') {
      useGameStore.setState({
        blastTileOverlay: data.overlay,
        blastSeed: data.seed,
      });
    }
    setBlastBoardUpdate(data);
  };
```

- [ ] **Step 2: Delete the `blastWaveAdvance` handler + its registration**

Remove `handleBlastWaveAdvance` (lines 745-761), its `socket.on('blastWaveAdvance', ...)` registration (~line 828-829), and its cleanup `socket.off('blastWaveAdvance', ...)` (~line 874-875).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If `BlastTileOverlay` is not imported in this file, add the import from `@/shared/types/blast`.

- [ ] **Step 4: Commit**

```bash
git add fe-next/player/hooks/socket/usePlayerGameEvents.ts
git commit -m "refactor(blast): client handles board regenerate via blastBoardUpdate, drops blastWaveAdvance"
```

---

### Task 12: Remove wave badge, add player timer, delete dead components

**Files:**
- Modify: `fe-next/host/components/tv-broadcast/TvGameHeader.tsx:186-199`
- Modify: `fe-next/components/game/BlastGame.tsx`
- Delete: `fe-next/components/results/BlastBoardDomination.tsx`, `fe-next/components/results/BlastResultsSummary.tsx`, `fe-next/components/game/BlastMoveCounter.tsx`

- [ ] **Step 1: Remove the wave badge from `TvGameHeader`**

Delete lines 186-199 (the `{gameMode === 'blast' && blastWave > 0 && ( ... )}` block). Remove the `blastWave` prop / `useBlastWave()` usage from this component and its parent if now unused (`grep -n "blastWave\|useBlastWave" fe-next/host/`).

- [ ] **Step 2: Render a player-visible timer in `BlastGame`**

`BlastGame.tsx` already receives `remainingTime` and `totalTime` props but renders no timer. Mirror how `ClassicGame` renders its timer — import the same timer component Classic uses (`CircularTimer` per exploration) and render it in `BlastGame`'s header area:

```tsx
import CircularTimer from '@/components/game/CircularTimer';
// ...inside the BlastGame header/HUD JSX:
<CircularTimer remainingTime={remainingTime} totalTime={totalTime} />
```

> Read `ClassicGame.tsx` first to copy the exact `CircularTimer` props + placement/styling wrapper so Blast matches the established pattern. Do not invent a new timer UI.

- [ ] **Step 3: Delete the three dead component files**

```bash
git rm fe-next/components/results/BlastBoardDomination.tsx fe-next/components/results/BlastResultsSummary.tsx fe-next/components/game/BlastMoveCounter.tsx
```

Also delete their test files if any exist (`grep -rl "BlastBoardDomination\|BlastResultsSummary\|BlastMoveCounter" fe-next/components/**/__tests__/`).

- [ ] **Step 4: Verify no dangling references**

Run: `grep -rn "BlastBoardDomination\|BlastResultsSummary\|BlastMoveCounter" fe-next/`
Expected: no results.
Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe-next/host/components/tv-broadcast/TvGameHeader.tsx fe-next/components/game/BlastGame.tsx
git commit -m "feat(blast): remove wave badge, add player timer, delete dead Blast UI"
```

---

### Task 13: Add Blast to the MP mode-picker, admin-only

> Blast is currently absent from the host MP mode-picker entirely — hosts cannot select it from the UI. This task adds it, gated so only admins see it (UI gate only; the server gate in `gameStartHandler.ts` stays `is_admin` OR `blast_access` as the safety net).

**Files:**
- Modify: `fe-next/host/components/pre-game/BattleModeCard.tsx:28-53`, `:57-66`
- Test: `fe-next/host/components/pre-game/__tests__/BattleModeCard.test.tsx` (existing or create)

- [ ] **Step 1: Write the failing test**

```tsx
describe('BattleModeCard — Blast gating', () => {
  it('shows Blast in the picker for admins', () => {
    render(<BattleModeCard {...baseProps} isAdmin={true} />);
    expect(screen.getByText(/blast/i)).toBeInTheDocument();
  });

  it('hides Blast from the picker for non-admins', () => {
    render(<BattleModeCard {...baseProps} isAdmin={false} />);
    expect(screen.queryByText(/blast/i)).not.toBeInTheDocument();
  });
});
```

> `baseProps` should match how `BattleModeCard` is already invoked by `HostPreGameView`. If the component does not currently receive `isAdmin`, add it as a prop (the parent `HostPreGameView` already computes `isAdmin` / `hasBlastAccess` via `useAuth()` — pass `isAdmin` down).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- BattleModeCard`
Expected: FAIL — Blast not in the picker at all.

- [ ] **Step 3: Add a Blast entry to `MODES` and gate `visibleModes`**

In `BattleModeCard.tsx`, add a `'blast'` entry to the `MODES` array (lines 28-53), matching the `ModeVisualConfig` shape of the existing entries. Pull Blast's icon / colors / label / description from the already-defined Blast visuals in `GameModeSelector.tsx` (`MODE_ICONS`, `MODE_ACTIVE_COLORS`, `MODE_GLOW` — read that file to copy the exact values; do not invent new visuals).

Then change `visibleModes` (line 66) from:

```typescript
  const visibleModes = MODES;
```

to:

```typescript
  // Blast is admin-gated in the picker (UI gate only; server still allows
  // is_admin OR blast_access). Non-admins never see it offered.
  const visibleModes = isAdmin ? MODES : MODES.filter((m) => m.mode !== 'blast');
```

Ensure `isAdmin` is in scope — add it to the component's props (typed `isAdmin?: boolean`) and have `HostPreGameView` pass its existing `isAdmin` value.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- BattleModeCard`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fe-next/host/components/pre-game/BattleModeCard.tsx fe-next/host/components/pre-game/HostPreGameView.tsx fe-next/host/components/pre-game/__tests__/BattleModeCard.test.tsx
git commit -m "feat(blast): add Blast to MP mode-picker, admin-only UI gate"
```

---

## PHASE 4 — Verification

### Task 14: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `cd fe-next && npm run lint`
Expected: clean (no new errors).

- [ ] **Step 2: Full test suite**

Run: `cd fe-next && npm run test`
Expected: all green. Pay attention to `blast`, `botGame`, `ResultsPage`, `selectors`, `gameStartHandler` suites.

- [ ] **Step 3: Build**

Run: `cd fe-next && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke (document result, do not skip)**

`npm run dev` (port **3001**). Start an MP Blast game with bots:
- As an admin host, Blast appears in the MP mode-picker; as a non-admin it does not.
- Player view shows a counting-down timer; no wave badge, no move counter.
- Bots visibly score throughout the game (not idle).
- Game ends when the timer hits 0, not before.
- Results page shows `BlastResultsScene` — ranked players, final scores, combo/gems/tiles/board-clears chips, best word.
- Test Hebrew via `?locale=he` — RTL layout intact.

State explicitly in the completion report whether the manual smoke passed or could not be run.

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore(blast): verification fixups for timer + results redesign"
```

---

## Self-Review

- **Spec coverage:** Part 1 (pure timer) → Tasks 1-5, 11, 12. Board-clear → refill+bonus → Tasks 2, 3, 4. Host timer setting respected → Task 1. Part 2 (bot idle) → Tasks 4, 6. Part 3 (results redesign) → Tasks 7-10. i18n → Task 8. SRV-M4 tradeoff → noted in Task 1's comment. Admin-only Blast in MP picker (added post-spec at user request) → Task 13. All spec sections mapped.
- **Placeholder scan:** No TBD/TODO. The one judgement-dependent spot (Task 12 Step 2 / Task 10 Step 1) gives a concrete instruction ("mirror ClassicGame's CircularTimer", "identify the existing scores map") rather than vague filler — the executor reads one named file to copy an established pattern.
- **Type consistency:** `BlastPlayerStats` gains `boardClears: number` in Task 2 and is used consistently in Tasks 7, 9. `regenerateBlastBoard` / `recordBlastBoardClear` signatures defined in Task 2 match call sites in Tasks 3, 4. `blastBoardUpdate` payload gains optional `overlay?`/`seed?` in Task 3, consumed in Task 11. Store field `blastBoardClears` defined in Task 7, selector `useBlastBoardClears` matches.
- **Debugging caveat:** Phase 2 explicitly forks — Task 6 Step 2/3 instruct the executor to stop and re-plan if the repro shows H2 (score-cap zeroing) instead of H1 (stale pool). This is intentional, not a placeholder.
