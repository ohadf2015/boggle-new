import { describe, it, expect } from 'vitest';
import { mechanicsForLevel } from '../mechanic-flags';

describe('mechanicsForLevel', () => {
  it('level 1 has all gates off', () => {
    const m = mechanicsForLevel(1);
    expect(m.coinOverlay).toBe(false);
    expect(m.frozenTiles).toBe(false);
    expect(m.cascadeWords).toBe(false);
  });
  it('level 3 unlocks coin overlay', () => {
    expect(mechanicsForLevel(3).coinOverlay).toBe(true);
    expect(mechanicsForLevel(2).coinOverlay).toBe(false);
  });
  it('shuffle button is permanently disabled at every level', () => {
    // Product decision: Blast V2 has no shuffle. Letters spread through
    // organic gravity collapse + chain placement balance; explicit re-roll
    // would break the deterministic chain puzzle.
    expect(mechanicsForLevel(1).shuffleButton).toBe(false);
    expect(mechanicsForLevel(5).shuffleButton).toBe(false);
    expect(mechanicsForLevel(50).shuffleButton).toBe(false);
    expect(mechanicsForLevel(100).shuffleButton).toBe(false);
  });
  it('level 8 unlocks frozen tiles', () => {
    expect(mechanicsForLevel(8).frozenTiles).toBe(true);
  });
  it('level 7 unlocks the reveal-letter hint (front-loaded from 18)', () => {
    expect(mechanicsForLevel(7).revealLetterHint).toBe(true);
    expect(mechanicsForLevel(6).revealLetterHint).toBe(false);
  });
  it('level 9 unlocks bonus dictionary (front-loaded from 25)', () => {
    expect(mechanicsForLevel(9).bonusDictionary).toBe(true);
    expect(mechanicsForLevel(8).bonusDictionary).toBe(false);
  });
  it('level 12 unlocks cascade words', () => {
    expect(mechanicsForLevel(12).cascadeWords).toBe(true);
  });
  it('level 35 unlocks lateral-slide', () => {
    expect(mechanicsForLevel(35).lateralSlideGravity).toBe(true);
  });
  it('level 40 unlocks multi-word reveal', () => {
    expect(mechanicsForLevel(40).multiWordReveal).toBe(true);
  });
  it('level 100 has every gate on except permanently-off shuffleButton', () => {
    const m = mechanicsForLevel(100);
    const { shuffleButton, ...rest } = m;
    expect(shuffleButton).toBe(false);
    Object.values(rest).forEach((v) => expect(v).toBe(true));
  });
});
