# MP Classic Mode: Rush Tiles + Live Leaderboard Clarity

Date: 2026-06-11 · Status: in-progress

## Goal (user)
Improve classic MP: (1) bonus tiles appear randomly for ALL players during the game, disappear after ~10s to increase rush; (2) improve performance; (3) desktop players must see the live leaderboard; (4) mobile players must clearly see their current place + when someone passes them.

## Findings (recon)
- **Bonus tiles today**: static golden letters (whole-game, +25%) + one-shot round events (lightning/blizzard/meteor at 50–75% mark). Neither is a recurring transient mechanic.
- **Desktop leaderboard**: hidden. `gameplayFocusMode={true}` is hardcoded for classic MP (`MultiplayerInGameView.tsx:397,598`); the desktop sidebar (leaderboard+chat+wordlist) sits behind `!gameplayFocusMode` (`PortraitLayout.tsx:680`).
- **Mobile**: `CompactLeaderboard` shows score prominently but rank is a 9px badge; ▲/▼ arrows fire on ANY rank change (incl. own gains), not specifically "you got passed".
- **Scoring**: char-based (word contains a special-tile letter), server-authoritative. Submit payload is char-based, no tile path.
- **Round-event lifecycle**: server spawns + server clears (`roundEventStart`/`roundEventEnd`), `activeRoundEvent` null when over; scoring keys off server state; `timerManager` prefix-keyed timers; `gameCleanupEmitter` clears on game end/reset.

## Design

### 1. Rush tiles (recurring, server-authoritative)
- **Independent state** — NOT `activeRoundEvent` (round event + rush tile can overlap). Add to `GameState`: `rushTiles?: {row,col}[]`, `rushTilesActive?: boolean`.
- New module `backend/modules/rushTilesManager.ts` modeled on `roundEventsManager` but with a **recurring** schedule:
  - Recurring spawn every ~18–25s (jittered), each batch lives `RUSH_TILE_DURATION_MS = 10_000`, then server-clears.
  - 2–3 random positions per batch (avoid colliding with golden? acceptable to overlap — different bonus).
  - Broadcast `rushTilesSpawn { tiles, durationMs }` (volatile) + `rushTilesClear {}`.
  - `timerManager` prefix `rushTiles:${gameCode}:`; `gameCleanupEmitter.onGameEnd/onGameReset` → clear.
  - Pure spawn logic (`computeRushTilePositions`, `nextRushDelayMs`) extracted + unit-tested.
- Start in `gameStartHandler` (classic, 2+ players) next to `scheduleRoundEvent`.
- **Scoring** in `wordValidationHandler`: `rushBonus = ceil(wordScore * RUSH_BONUS_MULT)` if `game.rushTilesActive && word uses a rush-tile letter`. Independent of `activeRoundEvent`. Surface `rushBonus` in `WordAcceptedPayload`.

### 2. Client rush-tile rendering
- `InGameScreen` socket listeners → `rushTiles` Set<"row-col">; auto-clear on `rushTilesClear`. (Server is source of truth; no client TTL.)
- Thread through `PortraitLayout` → `GridComponent` → `GridCell` new `isRush` visual (distinct color, pulsing, with a ~10s shrink/countdown). Reduced-motion fallback.
- Toast/feedback on rush bonus; i18n ×5.

### 3. Desktop leaderboard always visible
- Split the `!gameplayFocusMode` desktop block in `PortraitLayout`: render the **leaderboard sidebar** on `lg+` regardless of focus mode; keep chat + word list gated. Do NOT flip `gameplayFocusMode` globally.

### 4. Mobile place + overtake
- Pure `lib/multiplayer/overtakeDetection.ts`: given prev/next leaderboard + my username, detect rank DROP caused by another player → overtaker name(s). Mirror `useTvNotifications` `previousRankingsRef`.
- Persistent prominent "You're #N" on mobile (in/above CompactLeaderboard).
- Debounced overtake cue ("{name} passed you!") — once per overtaker per window, after rank settles. Reduced-motion + i18n ×5.

### 5. Performance
- Memoize leaderboard rows (now always-visible desktop list re-renders every 500ms throttle).
- Volatile lean rush-tile broadcasts.
- No speculative sweep — scope to the hot paths these additions touch.

## TDD
Pure modules tested (vitest): `computeRushTilePositions`, `nextRushDelayMs`, rush scoring helper, `overtakeDetection`, rank-calc. Supertest route tests are broken under backend config (memory) → test pure modules, not socket handlers.

## Constants
- `RUSH_TILE_DURATION_MS = 10_000`
- `RUSH_TILE_COUNT = 1–2` (grid-size scaled; kept small because char-based scoring otherwise qualifies nearly every word)
- `RUSH_SPAWN_MIN_MS / MAX_MS` ≈ 18_000 / 26_000 (jittered cadence)
- `RUSH_BONUS_MULT = 0.5` (+50%) — keep it a rush, not every word
