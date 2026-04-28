/**
 * Source-contract test: blast reconnect / late-join state restore in
 * usePlayerGameEvents (BLT-TEST-1, blast MP audit 2026-04-28).
 *
 * If a player drops mid-wave and rejoins, the server replays a `startGame`
 * with extData carrying the authoritative blast snapshot:
 *   - overlay, seed, wave, per-player move count
 *   - grid + tileStates (so the engine re-applies the cleared board)
 *
 * The handler must restore ALL of those fields atomically so the player
 * doesn't render a half-stale board.
 *
 * Mirrors the source-contract pattern of usePlayerGameEvents.blastWaveAdvance —
 * a render-level test would need ~15 mocks; this regex-over-source test
 * locks the wiring at syntactic level and survives refactors that preserve
 * the contract.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — blast reconnect / late-join state restore', () => {
  it('reads blastTileOverlay from server extData on (re)join', () => {
    expect(source).toMatch(/storeUpdates\.blastTileOverlay\s*=\s*ext\.blastTileOverlay/);
  });

  it('restores per-username blastMovesUsed from server', () => {
    expect(source).toMatch(/ext\.blastPlayerMoves/);
    expect(source).toMatch(/storeUpdates\.blastMovesUsed\s*=\s*myMoves/);
  });

  it('restores blastSeed for deterministic engine RNG', () => {
    // Without seed sync, client and server diverge on tile generation.
    expect(source).toMatch(/storeUpdates\.blastSeed\s*=\s*ext\.blastSeed/);
  });

  it('restores blastWave for wave-aware UI (HUD, mascot, archetype)', () => {
    expect(source).toMatch(/storeUpdates\.blastWave\s*=\s*ext\.blastWave/);
  });

  it('replays authoritative grid + tileStates via __server_reconnect__ sentinel', () => {
    // The sentinel tells BlastGame's applyServerBoard path that this is a
    // reconnect snapshot, not a normal word clear — different animation gate.
    expect(source).toMatch(/ext\.blastGrid/);
    expect(source).toMatch(/ext\.blastTileStates/);
    expect(source).toContain("'__server_reconnect__'");
  });

  it('guards each restore behind null-check on the corresponding extData field', () => {
    // No `ext.blastTileOverlay` → no restore at all (player joined before
    // a blast game was active). Guards prevent stomping fresh state.
    expect(source).toMatch(/if\s*\(\s*ext\.blastTileOverlay\s*\)/);
    expect(source).toMatch(/if\s*\(\s*ext\.blastSeed\s*!=\s*null\s*\)/);
    expect(source).toMatch(/if\s*\(\s*ext\.blastWave\s*!=\s*null\s*\)/);
  });

  it('batches reconnect updates into a single setState call (no cascading renders)', () => {
    // Per the existing comment at the batched-updates block: "Batch all
    // Zustand store updates into a single setState call (was 15+ individual
    // updates)". Reconnect path piggybacks on the same batch.
    expect(source).toMatch(/useGameStore\.setState\(storeUpdates\)/);
  });
});
