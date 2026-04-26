import { describe, it, expect } from 'vitest';
import { BOOST_TYPES, BOOST_CONFIGS, isBoostType } from '../boosts';

describe('boost types', () => {
  it('exposes the 4 v1 boost types', () => {
    expect(BOOST_TYPES).toEqual(['freezeTime', 'hint', 'scoreMultiplier', 'firstWordBonus']);
  });

  it('isBoostType narrows unknown strings', () => {
    expect(isBoostType('hint')).toBe(true);
    expect(isBoostType('sabotage')).toBe(false);
  });

  it('every type has a config entry', () => {
    for (const t of BOOST_TYPES) {
      expect(BOOST_CONFIGS[t]).toBeDefined();
      expect(BOOST_CONFIGS[t].i18nKey).toMatch(/^boosts\./);
    }
  });
});
