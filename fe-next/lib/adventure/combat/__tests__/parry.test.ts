/**
 * Tests for the boss parry system.
 * When a boss telegraphs an attack, the player can DEFEND by submitting a
 * QUALIFYING word before the telegraph ends. Qualifying = long enough OR a
 * weakness hit. A plain valid word does NOT parry (must be a real decision).
 */

import { getParryRequirement, evaluateParry, type ParryRequirement } from '../parry';
import type { WeaknessRule } from '../weakness';

const lengthWeak: WeaknessRule = { kind: 'length', param: 6, multiplier: 1.6, labelKey: 'k' };
const palindromeWeak: WeaknessRule = { kind: 'palindrome', multiplier: 2.0, labelKey: 'k' };

describe('getParryRequirement', () => {
  it('uses the base threshold in phase1', () => {
    const req = getParryRequirement(lengthWeak, 'phase1');
    expect(req.minLength).toBe(5);
    expect(req.weakness).toBe(lengthWeak);
  });

  it('eases the threshold in enraged phase so defense stays fair', () => {
    const req = getParryRequirement(lengthWeak, 'enraged');
    expect(req.minLength).toBeLessThanOrEqual(getParryRequirement(lengthWeak, 'phase1').minLength);
    expect(req.minLength).toBeGreaterThanOrEqual(4);
  });

  it('always carries a translatable hint key', () => {
    expect(getParryRequirement(lengthWeak, 'phase1').hintKey).toMatch(/^adventure\.boss\.combat\.parry\./);
  });
});

describe('evaluateParry', () => {
  const req: ParryRequirement = { minLength: 6, weakness: palindromeWeak, hintKey: 'k' };

  it('parries on a word at/above the min length', () => {
    const r = evaluateParry('LIBRARY', req); // 7 >= 6
    expect(r.parried).toBe(true);
    expect(r.reason).toBe('length');
  });

  it('parries on a weakness hit even if below min length', () => {
    const r = evaluateParry('LEVEL', req); // palindrome, 5 < 6
    expect(r.parried).toBe(true);
    expect(r.reason).toBe('weakness');
  });

  it('does NOT parry on a plain short valid word', () => {
    const r = evaluateParry('CATS', req); // 4 < 6, not palindrome
    expect(r.parried).toBe(false);
  });

  it('prefers the weakness reason when a word satisfies both', () => {
    const longPalReq: ParryRequirement = { minLength: 5, weakness: palindromeWeak, hintKey: 'k' };
    const r = evaluateParry('RACECAR', longPalReq); // 7 >= 5 AND palindrome
    expect(r.parried).toBe(true);
    expect(r.reason).toBe('weakness');
  });

  it('does not parry on an empty word', () => {
    expect(evaluateParry('', req).parried).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(evaluateParry('library', req).parried).toBe(true);
  });
});
