/**
 * Tests for boss elemental weakness system.
 * A boss is weak to a specific word-type derived from its twist mechanic.
 * Hitting the weakness deals a "WEAKNESS!" crit (damage multiplier).
 */

import {
  getBossWeakness,
  evaluateWeakness,
  WEAKNESS_BY_TWIST,
  type WeaknessRule,
} from '../weakness';
import { BOSS_TWIST_TYPES } from '@/types/boss';

describe('getBossWeakness', () => {
  it('returns a weakness rule for every twist type', () => {
    // GIVEN every boss twist type
    // THEN each maps to a defined weakness rule
    for (const twist of BOSS_TWIST_TYPES) {
      const rule = getBossWeakness(twist);
      expect(rule).toBeDefined();
      expect(rule.kind).toBeTruthy();
      expect(rule.multiplier).toBeGreaterThan(1);
      expect(rule.labelKey).toMatch(/^adventure\.boss\.combat\.weakness\./);
    }
  });

  it('makes the mirror boss weak to palindromes (thematic)', () => {
    const rule = getBossWeakness('mirrorMatch');
    expect(rule.kind).toBe('palindrome');
  });

  it('makes the hive boss weak to double letters', () => {
    expect(getBossWeakness('hiveMind').kind).toBe('doubleLetter');
  });

  it('falls back to a length weakness for an unknown twist', () => {
    // GIVEN a twist not in the table (defensive)
    const rule = getBossWeakness('totallyUnknown' as never);
    expect(rule.kind).toBe('length');
  });

  it('keeps the static table and the getter in sync', () => {
    for (const twist of BOSS_TWIST_TYPES) {
      expect(getBossWeakness(twist)).toEqual(WEAKNESS_BY_TWIST[twist]);
    }
  });
});

describe('evaluateWeakness', () => {
  const lengthRule: WeaknessRule = { kind: 'length', param: 6, multiplier: 1.6, labelKey: 'adventure.boss.combat.weakness.length' };
  const palindromeRule: WeaknessRule = { kind: 'palindrome', multiplier: 2.0, labelKey: 'adventure.boss.combat.weakness.palindrome' };
  const doubleRule: WeaknessRule = { kind: 'doubleLetter', multiplier: 1.6, labelKey: 'adventure.boss.combat.weakness.doubleLetter' };
  const rareRule: WeaknessRule = { kind: 'rareLetter', multiplier: 1.8, labelKey: 'adventure.boss.combat.weakness.rareLetter' };
  const vowelRule: WeaknessRule = { kind: 'vowelHeavy', param: 3, multiplier: 1.6, labelKey: 'adventure.boss.combat.weakness.vowelHeavy' };

  it('flags a long word as a weak hit for a length rule', () => {
    const r = evaluateWeakness('LIBRARY', lengthRule); // 7 >= 6
    expect(r.isWeakHit).toBe(true);
    expect(r.multiplier).toBe(1.6);
    expect(r.label).toBe('adventure.boss.combat.weakness.length');
  });

  it('does not flag a short word for a length rule', () => {
    const r = evaluateWeakness('CAT', lengthRule);
    expect(r.isWeakHit).toBe(false);
    expect(r.multiplier).toBe(1);
  });

  it('detects a palindrome', () => {
    expect(evaluateWeakness('LEVEL', palindromeRule).isWeakHit).toBe(true);
    expect(evaluateWeakness('RACECAR', palindromeRule).isWeakHit).toBe(true);
  });

  it('rejects a non-palindrome', () => {
    expect(evaluateWeakness('HELLO', palindromeRule).isWeakHit).toBe(false);
  });

  it('does not count a single letter as a palindrome', () => {
    expect(evaluateWeakness('A', palindromeRule).isWeakHit).toBe(false);
  });

  it('detects a doubled adjacent letter', () => {
    expect(evaluateWeakness('BUZZ', doubleRule).isWeakHit).toBe(true);
    expect(evaluateWeakness('LETTER', doubleRule).isWeakHit).toBe(true);
  });

  it('rejects a word with no doubled letter', () => {
    expect(evaluateWeakness('CAT', doubleRule).isWeakHit).toBe(false);
  });

  it('detects a rare letter (Q/X/Z/J)', () => {
    expect(evaluateWeakness('QUIZ', rareRule).isWeakHit).toBe(true);
    expect(evaluateWeakness('JINX', rareRule).isWeakHit).toBe(true);
  });

  it('rejects a common-letter word for a rare rule', () => {
    expect(evaluateWeakness('STONE', rareRule).isWeakHit).toBe(false);
  });

  it('detects a vowel-heavy word (>= distinct vowels)', () => {
    expect(evaluateWeakness('EDUCATION', vowelRule).isWeakHit).toBe(true); // a e i o u present
  });

  it('rejects a vowel-light word', () => {
    expect(evaluateWeakness('CRYPT', vowelRule).isWeakHit).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(evaluateWeakness('level', palindromeRule).isWeakHit).toBe(true);
  });

  it('returns multiplier 1 and isWeakHit false for empty word', () => {
    const r = evaluateWeakness('', lengthRule);
    expect(r.isWeakHit).toBe(false);
    expect(r.multiplier).toBe(1);
  });
});
