/**
 * Guard: the Locked/Key tile mechanic has been removed from Blast (SP + MP).
 *
 * `locked` tiles were inert gates unlocked only by an adjacent `key` tile — a
 * single coupled mechanic. Both are gone. These tests pin the removal so the
 * pair can never silently reappear via the type union or the wave distribution
 * (which is the SINGLE seeding source shared by single-player `generateTileStates`
 * and the multiplayer server's `generateBlastOverlay`).
 */
import { describe, it, expect } from 'vitest';
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import { getWaveConfig, getWaveDistribution } from '../blastWaveConfig';

describe('Blast locked/key removal', () => {
  it('does not list locked or key in BLAST_TILE_TYPE_LIST', () => {
    expect(BLAST_TILE_TYPE_LIST).not.toContain('locked' as never);
    expect(BLAST_TILE_TYPE_LIST).not.toContain('key' as never);
  });

  it('never assigns a locked or key share at any wave (SP + MP source)', () => {
    // Wave table is 1-indexed and caps at 12; sweep past the cap for safety.
    for (let wave = 1; wave <= 15; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      expect(dist.locked ?? 0).toBe(0);
      expect(dist.key ?? 0).toBe(0);
    }
  });

  it('keeps the distribution normalized without the locked/key shares', () => {
    const dist = getWaveDistribution(getWaveConfig(12));
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });
});
