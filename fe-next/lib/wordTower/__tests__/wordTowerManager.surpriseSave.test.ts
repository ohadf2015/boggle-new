/**
 * Save/restore boundary for the surprise (variable-reward) layer.
 *
 * The whole layer is built on "reload the same run → same score". That only
 * holds if the deterministic surprise state (seed + cooldown counter + banked
 * updraft) survives serialization. A pure-function determinism test can't catch
 * a serializer that drops the fields — this test crosses that exact boundary.
 */
import { describe, it, expect } from 'vitest';
import {
  initWordTowerState,
  serializeWordTowerState,
  restoreWordTowerState,
  applyTowerWord,
  type WordTowerSaveState,
} from '../wordTowerManager';
import { TOWER_SURPRISE_PITY } from '../towerSurprise';

const opts = { gameCode: 'DAILY-2026-06-13', playerId: 'solo', language: 'en' as const };

describe('serialize/restore — surprise state persistence', () => {
  it('carries surpriseSeed, wordsSinceSurprise and nextWordHeightMult across a save', () => {
    const live = {
      ...initWordTowerState(opts),
      surpriseSeed: 1234567,
      wordsSinceSurprise: 4,
      nextWordHeightMult: 1.5,
    };
    const restored = restoreWordTowerState(opts, serializeWordTowerState(live));
    expect(restored.surpriseSeed).toBe(1234567);
    expect(restored.wordsSinceSurprise).toBe(4);
    expect(restored.nextWordHeightMult).toBe(1.5);
  });

  it('keeps the next accepted word identical after a save round-trip (leaderboard integrity)', () => {
    // Prime a state that is buildable and one word from a guaranteed surprise.
    const live = {
      ...initWordTowerState(opts),
      anchorLetter: 'C',
      tray: ['A', 'T', 'E', 'R', 'S', 'N'],
      floors: [
        { word: 'W0', len: 3, meters: 5 },
        { word: 'W1', len: 3, meters: 5 },
        { word: 'W2', len: 3, meters: 5 },
      ],
      wordsSinceSurprise: TOWER_SURPRISE_PITY,
    };
    const direct = applyTowerWord(live, 'CAT');
    // Round-trip the state, re-pin the (unserialized) tray + floors so only the
    // surprise fields are under test, then apply the same word.
    const restored = {
      ...restoreWordTowerState(opts, serializeWordTowerState(live)),
      anchorLetter: 'C',
      tray: ['A', 'T', 'E', 'R', 'S', 'N'],
    };
    const afterReload = applyTowerWord(restored, 'CAT');
    expect(afterReload.result.meters).toBeCloseTo(direct.result.meters, 9);
    expect(afterReload.result.surprise?.event).toBe(direct.result.surprise?.event);
  });

  it('defaults safely for an old save blob that predates the surprise layer', () => {
    const legacy = serializeWordTowerState(initWordTowerState(opts)) as WordTowerSaveState;
    delete (legacy as Partial<WordTowerSaveState>).surpriseSeed;
    delete (legacy as Partial<WordTowerSaveState>).wordsSinceSurprise;
    delete (legacy as Partial<WordTowerSaveState>).nextWordHeightMult;
    const restored = restoreWordTowerState(opts, legacy);
    expect(typeof restored.surpriseSeed).toBe('number');
    expect(restored.wordsSinceSurprise).toBe(0);
    expect(restored.nextWordHeightMult).toBe(1);
  });
});
