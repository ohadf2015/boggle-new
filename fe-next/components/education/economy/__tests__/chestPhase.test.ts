import { describe, it, expect } from 'vitest';
import { CHEST_ODDS, CHEST_RARITIES } from '@/shared/constants/classroomEconomy';
import { nextChestPhase, oddsLabel } from '../chestPhase';

describe('nextChestPhase', () => {
  it('Given a sealed chest, When opened with motion on, Then it shakes first', () => {
    expect(nextChestPhase('sealed', false)).toBe('shaking');
  });

  it('Given reduced motion, When opened, Then it goes straight to the reveal', () => {
    expect(nextChestPhase('sealed', true)).toBe('revealed');
  });

  it('Given a shaking chest, Then it bursts, then reveals, and stays revealed', () => {
    expect(nextChestPhase('shaking', false)).toBe('bursting');
    expect(nextChestPhase('bursting', false)).toBe('revealed');
    expect(nextChestPhase('revealed', false)).toBe('revealed');
  });
});

describe('oddsLabel', () => {
  it('Given the shared odds, Then the label is read from the same constant the roller uses', () => {
    for (const r of CHEST_RARITIES) {
      expect(oddsLabel(r)).toBe(`${Math.round(CHEST_ODDS[r] * 100)}%`);
    }
  });

  it('Given the published odds, Then they add up to 100 percent', () => {
    const total = CHEST_RARITIES.reduce((sum, r) => sum + Math.round(CHEST_ODDS[r] * 100), 0);
    expect(total).toBe(100);
  });
});
