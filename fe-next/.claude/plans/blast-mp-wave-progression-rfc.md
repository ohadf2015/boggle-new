# RFC: Blast MP Wave Progression

**Status:** Draft · **Scope:** `fe-next/backend/handlers/wordValidationHandler.ts`, `fe-next/backend/modules/blastModeManager.ts`, `fe-next/components/blast/` · **Owner:** TBD

## Problem

MP blast is frozen at wave 1. `initBlastModeState(…, wave = 1, …)` is called once at game start; `wave` is never mutated. Players never see tile unlocks (prism wave 3, lightning wave 4, diamond wave 5, …) and the game ends on first board clear — a 60–90 s session with zero progression.

Singleplayer already has the full staircase via `getWaveConfig(wave)` in `components/blast/utils/blastWaveConfig.ts` (waves 1–12, archetype flavor, objective lists). MP would benefit from the same arc condensed.

## Goals

1. MP blast spans **3 waves by default** (configurable), not 1.
2. Wave transition is **server-authoritative** — all peers transition atomically via a single broadcast.
3. No added round-trip latency on the normal submit path. Transition piggybacks on the existing `blastBoardUpdate` snapshot pattern.
4. Late joiners / reconnects land on the current wave (reconnect handler must read `blastState.wave`).
5. Cosmetic: wave-intro screen shown once per wave with archetype copy; non-blocking (everyone can queue inputs during its 1.5 s show).

## Non-Goals

- Per-player wave (would break server-authoritative tile parity).
- Vote-to-skip / vote-to-continue (keep session flow simple; first-past-the-post board clear advances everyone).
- Multi-board racing (each player clears their own grid). Stays one shared grid.

## Proposed design

### Server

**Trigger:** existing `isBlastBoardCleared(tileStates)` branch in `wordValidationHandler.ts:145`. Today it schedules `endGame`. Change to:

```ts
if (isBlastBoardCleared(gravityResult.newTileStates)) {
  const nextWave = blastState.wave + 1;
  const maxWaves = game.blastMaxWaves ?? 3;
  if (nextWave > maxWaves) {
    // existing endGame path
  } else {
    const nextState = initBlastModeState(
      newGrid,
      Object.keys(blastState.playerMoves),
      nextWave,
      hashStringToSeed(`${game.code}:wave${nextWave}`), // new overlay seed per wave
    );
    // Preserve cumulative playerStats across waves; replace grid/overlay/tileStates.
    Object.assign(blastState, {
      wave: nextWave,
      overlay: nextState.overlay,
      overlayMap: nextState.overlayMap,
      tileStates: nextState.tileStates,
      seed: nextState.seed,
      grid: nextState.grid,
    });
    io.to(game.code).emit('blastWaveAdvance', {
      wave: nextWave,
      archetype: getWaveConfig(nextWave).archetype,
      grid: nextState.grid,
      tileStates: nextState.tileStates,
      overlay: nextState.overlay,
    });
  }
}
```

**Per-wave seed:** `hashStringToSeed('{code}:wave{N}')` — decorrelates from initial overlay seed, deterministic on reconnect.

**Cumulative stats:** `playerStats[username]` must survive the `Object.assign` (don't reset `wordsFound`, `gemsCollected`, etc). Moves reset is a design choice — leaning reset (matches SP wave-boundary feel).

### Client

New socket event handler in `useBlastMultiplayerBridge`:

```ts
socket.on('blastWaveAdvance', (payload) => {
  // Enqueue if cascading (same pattern as blastBoardUpdate coalesce).
  pendingBoardUpdatesRef.current.push({ grid: payload.grid, tileStates: payload.tileStates });
  // Fire wave-intro overlay (existing `BlastWaveIntroOverlay` component from SP).
  setActiveWave(payload.wave);
});
```

Reuse SP wave-intro component; gate it behind MP-specific text variant via `t('blast.wave.mp.intro')`.

### Reconnect

`playerReconnectHandler` already reads `blastState` from Redis. Must include `wave` in the `startGame` recovery payload so client mounts correct `BlastView` wave. Check via `backend/handlers/__tests__/gameLifecycleHandler.gameMode.test.ts:278` to extract `buildRecoveryStartGamePayload` — parked refactor still relevant; pick it up here.

## Alternatives considered

**A. Client-side wave advance (rejected):** races on which client increments first, overlay would diverge across peers. Server-authoritative is required for the seeded-RNG guarantee we got from Phase 1.

**B. Timer-based wave advance (rejected):** forces a rhythm that ignores player skill; skilled squad clears in 30 s and waits; struggling squad never advances. Clear-driven advance already paces itself.

**C. Score-threshold advance (rejected for MP):** SP uses `scoreThreshold`; MP has no cumulative player score signal shared across the room. Clear-driven is self-evidencing.

## Risks

1. **Stalled game** — squad can't clear. Mitigation: add `blastMaxMoves` per wave (already exists via `movesAllowed` in `WaveConfig`); if moves exhausted without clear, auto-advance or end.
2. **Wave-intro input loss** — player submits during 1.5 s intro, word collides with wave-N tiles. Mitigation: queue input client-side, dispatch on intro complete.
3. **Tile-bonus inflation** — wave 3+ tiles (diamond, lightning) have higher `BLAST_TILE_BONUSES`; one late-spawn whale dominates leaderboard. Mitigation: per-wave score subtotals displayed alongside cumulative.
4. **Reconnect mid-intro** — rejoined peer misses the overlay animation. Acceptable (non-blocking FX, stats intact).

## Build plan

1. **Phase A — server-side transition** (2 tests RED → GREEN)
   - `blastModeManager.advanceBlastWave(state, gameCode, grid): BlastModeState` pure fn.
   - `wordValidationHandler` branch: check wave < max, call advance, emit `blastWaveAdvance`.
2. **Phase B — client handler + reconnect**
   - `useBlastMultiplayerBridge` event wire-up.
   - Reconnect payload includes `wave`.
3. **Phase C — UI polish**
   - Wave-intro overlay reuse + translations.
4. **Phase D — balance tuning** (post-ship, telemetry-driven)
   - Decide wave count (3 vs 5 vs configurable).
   - Decide moves reset behavior.

## Open questions

- Default wave count: **3** (session length ~3 min) vs **5** (full SP arc condensed ~5 min)?
- Should `playerMoves` reset per wave or accumulate? Leaning reset.
- Per-wave overlay seed derivation: `hashStringToSeed('{code}:wave{N}')` or `(baseSeed ^ (wave * 0x9E3779B9))`? Both deterministic — former more legible.
- Solo→MP parity: SP uses objectives (`getWaveObjectives`); MP ignoring them in this RFC. Revisit in Phase D.
