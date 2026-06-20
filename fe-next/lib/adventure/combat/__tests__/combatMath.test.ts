/**
 * Tests for resolveAttackWord — the pure combat resolver.
 * Given a submitted word + its base boss damage and the combat context
 * (boss weakness, whether FOCUS crit is armed, and any active parry window),
 * it returns the final damage and what happened (weak hit, crit, parry).
 */

import { resolveAttackWord, type CombatContext } from '../combatMath';
import { getBossWeakness } from '../weakness';
import { getParryRequirement } from '../parry';

const palWeak = getBossWeakness('mirrorMatch'); // palindrome, x2.0
const lenWeak = getBossWeakness('popQuiz'); // length>=6, x1.6

function ctx(over: Partial<CombatContext>): CombatContext {
  return { weakness: lenWeak, focusArmed: false, parryReq: null, ...over };
}

describe('resolveAttackWord — weakness crit', () => {
  it('multiplies damage on a weakness hit and flags it', () => {
    const r = resolveAttackWord('LIBRARY', 100, ctx({ weakness: lenWeak })); // 7>=6
    expect(r.isWeakHit).toBe(true);
    expect(r.damage).toBe(160); // 100 * 1.6
    expect(r.weaknessLabel).toBe(lenWeak.labelKey);
  });

  it('leaves damage unchanged on a non-weak word', () => {
    const r = resolveAttackWord('CAT', 100, ctx({ weakness: lenWeak }));
    expect(r.isWeakHit).toBe(false);
    expect(r.damage).toBe(100);
  });
});

describe('resolveAttackWord — focus crit', () => {
  it('doubles damage and consumes focus when armed', () => {
    const r = resolveAttackWord('CAT', 50, ctx({ focusArmed: true }));
    expect(r.isCrit).toBe(true);
    expect(r.focusConsumed).toBe(true);
    expect(r.damage).toBe(100);
  });

  it('stacks focus crit on top of a weakness hit', () => {
    const r = resolveAttackWord('LIBRARY', 100, ctx({ weakness: lenWeak, focusArmed: true }));
    expect(r.damage).toBe(320); // 100 * 1.6 * 2
    expect(r.isWeakHit).toBe(true);
    expect(r.isCrit).toBe(true);
  });

  it('does not consume focus when not armed', () => {
    const r = resolveAttackWord('CAT', 50, ctx({ focusArmed: false }));
    expect(r.isCrit).toBe(false);
    expect(r.focusConsumed).toBe(false);
  });
});

describe('resolveAttackWord — parry', () => {
  it('marks a parry when a qualifying word lands during a telegraph', () => {
    const req = getParryRequirement(palWeak, 'phase1'); // minLen 6 or palindrome
    const r = resolveAttackWord('LEVEL', 30, ctx({ weakness: palWeak, parryReq: req })); // palindrome
    expect(r.parried).toBe(true);
    expect(r.parryReason).toBe('weakness');
  });

  it('does not parry a short plain word during a telegraph', () => {
    const req = getParryRequirement(palWeak, 'phase1');
    const r = resolveAttackWord('CATS', 30, ctx({ weakness: palWeak, parryReq: req }));
    expect(r.parried).toBe(false);
  });

  it('never parries when there is no active telegraph', () => {
    const r = resolveAttackWord('LIBRARY', 30, ctx({ parryReq: null }));
    expect(r.parried).toBe(false);
  });
});

describe('resolveAttackWord — guards', () => {
  it('always returns a positive integer damage', () => {
    const r = resolveAttackWord('LIBRARY', 1, ctx({ weakness: lenWeak }));
    expect(Number.isInteger(r.damage)).toBe(true);
    expect(r.damage).toBeGreaterThan(0);
  });
});
