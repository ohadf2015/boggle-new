/**
 * Client-side combo DISPLAY rules.
 *
 * Points are the server's business (backend/modules/duelCombo.ts). This module
 * only turns the streak the server sends into a tier name, a mascot and a bar
 * fill, so the two sides can never drift on scoring (Class 3).
 */

import { describe, it, expect } from 'vitest';
import {
  duelComboTier,
  duelComboMeterFill,
  isDuelComboTierUp,
  DUEL_COMBO_TIERS,
} from '../duelCombo';

describe('duelComboTier', () => {
  it('has no tier at all before a chain exists', () => {
    expect(duelComboTier(0).id).toBe('none');
    expect(duelComboTier(1).id).toBe('none');
  });

  it('lights the first tier at two chained words', () => {
    expect(duelComboTier(2).id).toBe('spark');
    expect(duelComboTier(3).id).toBe('spark');
  });

  it('escalates through the tiers as the chain grows', () => {
    expect(duelComboTier(4).id).toBe('blaze');
    expect(duelComboTier(6).id).toBe('inferno');
    expect(duelComboTier(10).id).toBe('supernova');
    expect(duelComboTier(99).id).toBe('supernova');
  });

  it('gives every tier a translation key and a mascot', () => {
    for (const tier of DUEL_COMBO_TIERS) {
      expect(tier.labelKey.startsWith('education.duels.')).toBe(true);
      expect(tier.mascotSrc).toMatch(/^\/mascot\//);
    }
  });
});

describe('duelComboMeterFill', () => {
  it('is empty with no chain and full at the top tier', () => {
    expect(duelComboMeterFill(0)).toBe(0);
    expect(duelComboMeterFill(10)).toBe(1);
  });

  it('never exceeds one however long the chain runs', () => {
    expect(duelComboMeterFill(500)).toBe(1);
  });

  it('grows monotonically with the streak', () => {
    const fills = [1, 2, 4, 6, 8].map(duelComboMeterFill);
    const sorted = [...fills].sort((a, b) => a - b);
    expect(fills).toEqual(sorted);
  });
});

describe('isDuelComboTierUp', () => {
  it('is true only when the chain crosses into a new tier', () => {
    expect(isDuelComboTierUp(1, 2)).toBe(true);
    expect(isDuelComboTierUp(2, 3)).toBe(false);
    expect(isDuelComboTierUp(3, 4)).toBe(true);
  });

  it('is false when the chain breaks', () => {
    expect(isDuelComboTierUp(6, 0)).toBe(false);
    expect(isDuelComboTierUp(6, 1)).toBe(false);
  });
});
