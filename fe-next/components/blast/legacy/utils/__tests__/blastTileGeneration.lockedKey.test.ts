/**
 * Phase 3 RED tests — Locked + Key tile pairing + wave gating.
 *
 * Generation invariants:
 * - Before the unlock wave, zero locked+key tiles are placed.
 * - At/after the unlock wave, every 'locked' tile has a reachable 'key' tile
 *   (Manhattan distance ≤ 3), mirroring the fuse pairing precedent.
 * - Orphan locked OR orphan key → downgraded to 'standard'.
 */
import { generateTileStates, resetTileUidCounter } from '../blastTileGeneration';
import { getWaveDistribution, getWaveConfig } from '../blastWaveConfig';
import type { BlastTileState } from '../../types';

const MAX_PAIR_DISTANCE = 3;

function flat(tiles: BlastTileState[][]): BlastTileState[] {
  return tiles.flat();
}

function countByType(tiles: BlastTileState[][], type: string): number {
  return flat(tiles).filter(t => t.type === type).length;
}

function hasReachableKey(tiles: BlastTileState[][], locked: BlastTileState): boolean {
  return flat(tiles).some(
    t =>
      t.type === 'key' &&
      Math.abs(t.row - locked.row) + Math.abs(t.col - locked.col) <= MAX_PAIR_DISTANCE,
  );
}

describe('generateTileStates — locked/key pairing (Phase 3)', () => {
  beforeEach(() => {
    resetTileUidCounter();
  });

  it('places zero locked or key tiles before the unlock wave', () => {
    // Saturate the special-tile chance so we exercise the distribution fully.
    const tiles = generateTileStates(8, 1, 42, undefined, 1);
    expect(countByType(tiles, 'locked')).toBe(0);
    expect(countByType(tiles, 'key')).toBe(0);
  });

  it('locked+key absent through FTUE cohort (waves 1-10), present from wave 11+', () => {
    // Revival sprint 2026-05-10: locked+key un-retired at wave 11.
    for (let w = 1; w <= 10; w++) {
      const dist = getWaveDistribution(getWaveConfig(w));
      expect(dist.locked ?? 0).toBe(0);
      expect(dist.key ?? 0).toBe(0);
    }
    for (let w = 11; w <= 12; w++) {
      const dist = getWaveDistribution(getWaveConfig(w));
      expect(dist.locked).toBeGreaterThan(0);
      expect(dist.key).toBeGreaterThan(0);
    }
  });

  it('every locked tile has a reachable key tile within Manhattan ≤3', () => {
    // Use a saturated chance and a late wave so locked+key are enabled.
    const tiles = generateTileStates(8, 1, 12345, undefined, 12);
    const locked = flat(tiles).filter(t => t.type === 'locked');
    // If any locked were placed, each must have a partner key reachable.
    for (const l of locked) {
      expect(hasReachableKey(tiles, l)).toBe(true);
    }
  });

  it('downgrades orphan locked tiles to standard', () => {
    // Force-feed a custom distribution with only 'locked' — no keys at all.
    // Every locked will be an orphan → all should downgrade to standard.
    const tiles = generateTileStates(6, 1, 7, { locked: 1 }, 12);
    expect(countByType(tiles, 'locked')).toBe(0);
  });

  it('downgrades orphan key tiles to standard', () => {
    const tiles = generateTileStates(6, 1, 7, { key: 1 }, 12);
    expect(countByType(tiles, 'key')).toBe(0);
  });
});
