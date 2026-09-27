import { describe, it, expect } from 'vitest';
import {
  initWordTowerState,
  applyTowerWord,
  floorMeters,
  type WordTowerPlayerState,
} from '../wordTowerManager';
import {
  resolveTowerSubmitSurprise,
  initialTowerSurpriseSeed,
  TOWER_SURPRISE_PITY,
  TOWER_SURPRISE_UNLOCK_FLOOR,
  type TowerSurpriseState,
} from '../towerSurprise';

/** A state where the word "CAT" (anchor C + tray A,T) is buildable, deep enough
 *  to have armed the surprise layer. */
function buildableState(overrides: Partial<WordTowerPlayerState> = {}): WordTowerPlayerState {
  const base = initWordTowerState({ gameCode: 'TEST-RUN', playerId: 'solo', language: 'en' });
  return {
    ...base,
    anchorLetter: 'C',
    tray: ['A', 'T', 'E', 'R', 'S', 'N'],
    floors: Array.from({ length: TOWER_SURPRISE_UNLOCK_FLOOR }, (_, i) => ({
      word: `W${i}`,
      len: 3,
      meters: 5,
    })),
    combo: 0,
    ...overrides,
  };
}

describe('applyTowerWord — surprise integration', () => {
  it('fires a surprise on the pity word and resets the counter in state', () => {
    const state = buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY });
    const { state: next, result } = applyTowerWord(state, 'CAT');
    expect(result.surprise).not.toBeNull();
    expect(next.wordsSinceSurprise).toBe(0);
  });

  it('stays silent during the cooldown window (no surprise, plain height)', () => {
    const state = buildableState({ wordsSinceSurprise: 0 });
    const { result } = applyTowerWord(state, 'CAT');
    expect(result.surprise).toBeNull();
    // wordsSinceSurprise 0 -> next word is in cooldown -> no bonus, base height only
    expect(result.meters).toBeCloseTo(floorMeters('CAT'.length, 1), 5);
  });

  it('applies the surprise bonus meters to the floor height (wiring proof)', () => {
    const state = buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY });
    // Recompute the surprise deltas independently and assert the manager used them.
    const prev: TowerSurpriseState = {
      surpriseSeed: state.surpriseSeed ?? initialTowerSurpriseSeed(state.gameCode),
      wordsSinceSurprise: state.wordsSinceSurprise ?? 0,
      nextWordHeightMult: state.nextWordHeightMult ?? 1,
      activeSurprise: null,
    };
    const base = floorMeters('CAT'.length, 1);
    const sr = resolveTowerSubmitSurprise(prev, {
      floorCount: state.floors.length,
      wordLen: 3,
      combo: 1,
      baseMeters: base,
    });
    const expectedMeters = base * sr.appliedHeightMult + sr.bonusMeters;
    const { result } = applyTowerWord(state, 'CAT');
    expect(result.meters).toBeCloseTo(expectedMeters, 5);
  });

  it('credits surprise scrambles into the bank', () => {
    const state = buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY, scramblesLeft: 0 });
    const prev: TowerSurpriseState = {
      surpriseSeed: state.surpriseSeed ?? initialTowerSurpriseSeed(state.gameCode),
      wordsSinceSurprise: TOWER_SURPRISE_PITY,
      nextWordHeightMult: 1,
      activeSurprise: null,
    };
    const sr = resolveTowerSubmitSurprise(prev, {
      floorCount: state.floors.length,
      wordLen: 3,
      combo: 1,
      baseMeters: floorMeters(3, 1),
    });
    const { state: next } = applyTowerWord(state, 'CAT');
    expect(next.scramblesLeft).toBeGreaterThanOrEqual(sr.bonusScrambles);
  });

  it('is deterministic — same state in, same height + surprise out (leaderboard integrity)', () => {
    const a = applyTowerWord(buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY }), 'CAT');
    const b = applyTowerWord(buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY }), 'CAT');
    expect(b.result.meters).toBeCloseTo(a.result.meters, 9);
    expect(b.result.surprise?.event).toBe(a.result.surprise?.event);
  });

  it('REWARD INTEGRITY: the pop value (activeSurprise.bonusMeters) is exactly the height granted beyond the base', () => {
    const state = buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY });
    const base = floorMeters('CAT'.length, 1);
    const { result } = applyTowerWord(state, 'CAT');
    expect(result.surprise).not.toBeNull();
    const popMeters = result.surprise!.bonusMeters;
    // Height actually added beyond the base climb == what the pop advertises.
    // (No updraft banked here, so appliedHeightMult is 1.)
    expect(result.meters - base).toBeCloseTo(popMeters, 5);
  });

  it('REWARD INTEGRITY: the pop value (activeSurprise.bonusScrambles) is exactly the scrambles credited', () => {
    // floorMeters('CAT') is below the earn-every threshold, so the ONLY scramble
    // delta is the surprise bonus — the pop must equal that delta.
    const state = buildableState({ wordsSinceSurprise: TOWER_SURPRISE_PITY, scramblesLeft: 0, heightHighWaterM: 9999 });
    const { state: next, result } = applyTowerWord(state, 'CAT');
    expect(result.surprise).not.toBeNull();
    expect(next.scramblesLeft - state.scramblesLeft).toBe(result.surprise!.bonusScrambles);
  });

  it('REWARD INTEGRITY: a banked updraft pays its promised multiplier out on the NEXT word', () => {
    // Cooldown word (no NEW surprise) carrying a banked ×1.5 updraft charge.
    const state = buildableState({ wordsSinceSurprise: 0, nextWordHeightMult: 1.5 });
    const base = floorMeters('CAT'.length, 1);
    const { result } = applyTowerWord(state, 'CAT');
    expect(result.surprise).toBeNull(); // still in cooldown — no new pop
    expect(result.meters).toBeCloseTo(base * 1.5, 5); // but the charge paid out
  });

  it('REWARD INTEGRITY: an updraft charge is consumed once, not forever', () => {
    const state = buildableState({ wordsSinceSurprise: 0, nextWordHeightMult: 1.5 });
    const { state: afterFirst } = applyTowerWord(state, 'CAT');
    // The next word (different anchor/tray) should NOT still carry ×1.5.
    expect(afterFirst.nextWordHeightMult).toBe(1);
  });

  it('works on a restored save with no surprise fields (backward compat)', () => {
    const legacy = buildableState();
    // Simulate an old persisted run: strip the surprise fields entirely.
    delete (legacy as Partial<WordTowerPlayerState>).surpriseSeed;
    delete (legacy as Partial<WordTowerPlayerState>).wordsSinceSurprise;
    delete (legacy as Partial<WordTowerPlayerState>).nextWordHeightMult;
    expect(() => applyTowerWord(legacy, 'CAT')).not.toThrow();
    const { state: next } = applyTowerWord(legacy, 'CAT');
    expect(typeof next.surpriseSeed).toBe('number');
  });
});
