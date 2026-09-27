import { describe, it, expect } from 'vitest';
import {
  initWordTowerState,
  applyTowerWord,
  serializeWordTowerState,
  restoreWordTowerState,
} from '../wordTowerManager';

/**
 * The signed drop offset is part of the tower's GEOMETRY, not just its score —
 * the scene lays each floor at the offset it was actually dropped at, so a
 * reload must rebuild the same wonky silhouette.
 */
const opts = { gameCode: 'daily-2026-08-07', playerId: 'daily', language: 'en' as const };

describe('applyTowerWord — records the drop offset on the floor', () => {
  it('stores the signed offset it was placed with', () => {
    const s0 = initWordTowerState(opts);
    const { state } = applyTowerWord(s0, 'CAT', 1, -0.42);
    expect(state.floors[0].offset).toBeCloseTo(-0.42, 5);
  });

  it('defaults to a dead-centre placement when no offset is supplied', () => {
    const s0 = initWordTowerState(opts);
    const { state } = applyTowerWord(s0, 'CAT', 1);
    expect(state.floors[0].offset ?? 0).toBe(0);
  });

  it('clamps an out-of-range offset into -1..1', () => {
    const s0 = initWordTowerState(opts);
    const { state } = applyTowerWord(s0, 'CAT', 1, 4.2);
    expect(state.floors[0].offset).toBe(1);
    const { state: s2 } = applyTowerWord(state, 'TAR', 1, -9);
    expect(s2.floors[1].offset).toBe(-1);
  });

  it('survives a save → restore round-trip so the tower redraws identically', () => {
    const s0 = initWordTowerState(opts);
    const { state: s1 } = applyTowerWord(s0, 'CAT', 1, 0.31);
    const { state: s2 } = applyTowerWord(s1, 'TAR', 1, -0.55);
    const restored = restoreWordTowerState(opts, serializeWordTowerState(s2));
    expect(restored.floors.map((f) => f.offset)).toEqual([0.31, -0.55]);
  });
});
