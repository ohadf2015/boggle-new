# Blast MP tile-coherence fixes — spec

**Date:** 2026-06-06
**Reported:** "sometime in blast mode mp tiles arent coherent and show up and disappear occasionally with no reason. in addition the locked tiles should be removed already but i still see them."

## Root causes (evidence-backed, not guesses)

Both SP and MP render `components/blast/legacy/` (v2 is admin-only — `app/[locale]/blast/page.tsx`).
Per-player boards (commit `15175c376`) → a player's `blastBoardUpdate` is driven only by their OWN word
submits, never opponent interleaving. Server is authoritative: `cascadeBlastWord`
(`backend/modules/blastModeManager.ts:211`) mutates the board, `wordValidationHandler.ts` emits a FULL
`blastBoardUpdate`, client `applyServerBoard` (`useBlastEngine.ts:564`) wholesale-replaces tileStates.

### Bug B — "locked tiles still visible" (ice/frozen never thaw in MP)
The "lock" overlay is rendered for un-thawed ice/frozen tiles:
`isLocked={!cellFilter(...) && !tile.isCleared}` (`BlastBoard.tsx:308`), and `cellFilter` blocks
ice/frozen while `!tile.isThawed`. The CLIENT computes thaw locally (`computeThawedCells`,
`useBlastEngine.ts:354`) but the SERVER's `cascadeBlastWord` NEVER computes thaw. The wholesale server
replacement wipes the locally-set `isThawed`, so the lock overlay re-appears and STICKS permanently in MP.
- `isThawed` survives gravity (`blastGravity.ts:129,141,165` spread it) ✓
- `isThawed` survives the socket payload (type has it, no schema strips it) ✓
- Sole defect: server omits the thaw computation.

### Bug A — "tiles appear/disappear occasionally" (client/server RNG asymmetry)
The client predicts the board optimistically; on divergence the full server board snaps in (positional
keys + `AnimatePresence` → exit/enter = flash). Divergence sources discriminated:
- Refill RNG: N/A — MP gravity runs `refill=false` (shrink mode). Eliminated.
- **Q4 (primary):** client calls `processTilesForWord` with NO `rng` (`useBlastEngine.ts:311`); server
  passes a seeded `rng` (`blastModeManager.ts:229`). `processTilesForWord` uses `rng` for prism-tile
  conversions → client `Math.random` vs server seeded → prism-spawned tile TYPES diverge → server echo
  swaps tiles. "Occasional" because it only triggers on prism clears.
- **Q5:** client move counter `movesUsed` counts invalid words; server `totalMoves` counts valid only →
  `createSeededRandom(seed + counter)` desyncs even when both use seeded RNG.

## Fix plan (layered, each independently testable)

**Phase 1 — Bug B (server thaw).** Extract `computeThawedCells` → pure `blastThaw.ts` util (re-export
from `blastCellFilterLogic.ts`; client path unchanged). In `cascadeBlastWord`, after
`processTilesForWord` and BEFORE gravity, compute thawed cells from `processResult.next` + `wordPath`,
set `isThawed=true`; gravity preserves it. RED test: ice adjacent to word path → `isThawed=true` survives
`cascadeBlastWord`.

**Phase 2 — Bug A (flicker).**
- 2a Equality-check no-op: skip `applyServerBoard` when incoming board structurally equals current local
  board (per-cell letter + isCleared + type + isThawed). Kills flicker whenever prediction was right.
  Cannot short-circuit near ice until Phase 1 lands (board always differed). Pure, unit-testable.
- 2b Determinism: client `submitWord` passes `createSeededRandom(seed + validMoveCount)` to
  `processTilesForWord`, matching server seed (XOR'd `blastSeed`) + a valid-word-only counter. Makes
  prism spawns match → equality check fires even on prism clears. Cross-check test: client submit output
  == server cascade output for same seed+move.
- 2c (defer) re-key tiles by `uid` instead of `row-col` — only if flicker persists after 1+2a+2b.

Don't drop optimistic prediction (RTT latency per word wrecks feel).

## Status (2026-06-06) — UNCOMMITTED

- **Phase 1 (Bug B) DONE.** `blastThaw.ts` util extracted (re-exported from `blastCellFilterLogic.ts`,
  client paths unchanged); `cascadeBlastWord` now thaws pre-gravity. RED→GREEN 3 tests
  (`blastModeManager.thaw.test.ts`); 861 backend tests green; 30 cell-filter tests green. Locked-overlay
  stick = FIXED.
- **Phase 2a (equality no-op) DONE.** `blastBoardEquality.ts` (`blastBoardsEqual`, compares every render
  field; uid/row/col excluded by design); guard added to `applyServerBoard`. Comparator 8 tests green.
  Hook-wiring test added to `useBlastEngine.mpGrid.test.ts` but that file **OOMs at import in this
  sandbox** (heavy useBlastEngine graph under jsdom; affects its pre-existing tests too — env limit, not
  the test) → CI-verify. Lint0, type-clean (only pre-existing backend→components rootDir warnings).
- **Phase 2b (client/server RNG determinism) DONE.** Root cause of *prism-clear* flicker. Wiring verified
  safe (NOT brittle as first feared): client `blastSeed` === server XOR'd `board.seed` (Q2); server
  `totalMoves` is monotonic (waves removed 2026-05-14, regen preserves it) and re-syncs seed on regen
  (`usePlayerGameEvents.ts:848`). Fix: `useBlastEngine.submitWord` now passes
  `createSeededRandom(blastSeedRef + validMovesRef)` to `processTilesForWord` in MP (SP stays
  `Math.random`); seed read via ref to dodge submitWord's stale-closure (deps `[gridSize, currentWave]`);
  `validMovesRef` counts valid words only (mirrors server). Offline cross-check test
  (`blastMpDeterminism.test.ts`, 3 green) pins the contract + discriminates the off-by-one bug. Makes the
  client board fully match the server → 2a's guard no-ops every word → flicker eliminated, not just reduced.
- **Phase 2c (uid keying) DEFERRED — not needed.** Determinism (2b) makes boards match, so positional keys
  no longer flash. Kept as last resort only if a live playtest shows residual flicker from a genuine
  client/server validation mismatch (rare; dicts match).

### Residual tail (disclosed, not claimed-fixed)
- **Shuffle tile**: UNREACHABLE in MP — MP is locked to Wave 3 (`gameStartHandler.ts:514`), `shuffle`
  enables Wave 9+. BUT latent footgun: `submitWord` shuffle-rearrange (`useBlastEngine.ts:~362`) uses
  unseeded `Math.random` *outside* processTilesForWord and the server's `cascadeBlastWord` ignores
  `shuffleTriggered` entirely → if shuffle is ever enabled in MP it WILL diverge/flicker. Before enabling:
  seed it + mirror server-side, or gate `!isMultiplayer`. Same for the manual `shuffleGrid` power button
  (`useBlastEngine.ts:~497`, `generateBlastLetter`) if it's usable in MP — separate explicit action.
- **Counter-drift edge**: `validMovesRef` increments on locally-accepted words; the server validates
  independently. On a single client-accept / server-reject (documented dict divergence exists —
  see `spanish-accent-rejection` memory), the ref permanently leads `totalMoves` → seeds desync → 2a stops
  no-op'ing → flicker on every subsequent word (tiles stay server-correct, self-heal, but flash). Not
  resync'd (the server sends `totalMoves` per update, but resync has a back-to-back-submit ordering
  hazard — left low-surface). Rare; dicts should match.

So honestly: **locked tiles = FIXED; flicker = dominant cause (ice thaw-flip) FIXED + prism-clear cause
FIXED + redundant-replace FIXED.** Long-tail (shuffle footgun unreachable-in-MP, dict-drift) disclosed.
NOT "all flicker eliminated."

NOT live-playtested (MP socket-gated host room won't create headless — env limit). The heavy
`useBlastEngine.mpGrid.test.ts` hook tests (incl. the 2 new applyServerBoard no-op tests) OOM at import in
this sandbox → CI-verify. All pure/backend logic (897 backend + comparator + determinism + cell-filter)
green.
