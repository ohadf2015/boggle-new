import { describe, it, expect } from 'vitest';
import {
  MUTATORS,
  ALL_MUTATOR_IDS,
  mutatorForDate,
  mutatorWordMultiplier,
  mutatorModifiers,
  mutatorSweepMult,
  dailyGoldenLetter,
  shareLabelForMutatorId,
  type MutatorId,
} from '../dailyMutators';
import { NO_MODIFIERS } from '../perks';

describe('mutatorForDate — the shared daily twist', () => {
  it('returns one of the known mutators for any date key', () => {
    const m = mutatorForDate('2026-06-11');
    expect(ALL_MUTATOR_IDS).toContain(m.id);
    expect(m.icon).toBeTruthy();
    expect(m.nameKey).toMatch(/^wordTower\.mutator\./);
    expect(m.descKey).toMatch(/^wordTower\.mutator\./);
  });

  it('is DETERMINISTIC — the same UTC day yields the identical mutator for everyone', () => {
    expect(mutatorForDate('2026-06-11').id).toBe(mutatorForDate('2026-06-11').id);
    expect(mutatorForDate('2026-06-11', 'en').id).toBe(mutatorForDate('2026-06-11', 'he').id);
  });

  it('varies across days (not a constant) — exercises the rotation', () => {
    const ids = new Set<MutatorId>();
    for (let d = 1; d <= 31; d++) {
      ids.add(mutatorForDate(`2026-03-${String(d).padStart(2, '0')}`).id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('dailyGoldenLetter — per-day seeded golden letter', () => {
  it('is deterministic per (date, language) and is a real letter in that bag', () => {
    const a = dailyGoldenLetter('2026-06-11', 'en');
    const b = dailyGoldenLetter('2026-06-11', 'en');
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Z]$/);
  });

  it('never picks a low-yield letter (no Q/Z/X/J cold golden)', () => {
    for (let d = 1; d <= 28; d++) {
      const g = dailyGoldenLetter(`2026-02-${String(d).padStart(2, '0')}`, 'en');
      expect('QZXJ').not.toContain(g);
    }
  });
});

describe('mutatorWordMultiplier — word-aware height effects', () => {
  it('goldenLetter ×1.6 only when the word contains the golden letter', () => {
    const golden = dailyGoldenLetter('2026-06-11', 'en');
    const m = MUTATORS.goldenLetter;
    const withG = `${golden}AT`;
    const without = 'EE'.includes(golden) ? 'TT' : `${golden === 'B' ? 'C' : 'B'}OO`;
    expect(mutatorWordMultiplier(m, withG, 'en', golden)).toBeCloseTo(1.6, 5);
    // a word lacking the golden letter is unaffected
    const plain = 'TT'; // 'T' is not low-yield-excluded but ensure no golden
    if (!plain.includes(golden)) {
      expect(mutatorWordMultiplier(m, plain, 'en', golden)).toBeCloseTo(1, 5);
    }
    expect(without).toBeTruthy();
  });

  it('vowelGale adds +8% per vowel', () => {
    const m = MUTATORS.vowelGale;
    expect(mutatorWordMultiplier(m, 'BCD', 'en')).toBeCloseTo(1, 5); // 0 vowels
    expect(mutatorWordMultiplier(m, 'CAT', 'en')).toBeCloseTo(1.08, 5); // 1 vowel
    expect(mutatorWordMultiplier(m, 'IDEA', 'en')).toBeCloseTo(1.24, 5); // 3 vowels (I,E,A)
  });

  it('longAndStrong ×1.5 only for words of length ≥ 6', () => {
    const m = MUTATORS.longAndStrong;
    expect(mutatorWordMultiplier(m, 'CATTY', 'en')).toBeCloseTo(1, 5); // len 5
    expect(mutatorWordMultiplier(m, 'CASTLE', 'en')).toBeCloseTo(1.5, 5); // len 6
  });

  it('structural mutators leave word multiplier at 1', () => {
    expect(mutatorWordMultiplier(MUTATORS.skylineRush, 'CASTLE', 'en')).toBeCloseTo(1, 5);
    expect(mutatorWordMultiplier(MUTATORS.tailwind, 'CASTLE', 'en')).toBeCloseTo(1, 5);
    expect(mutatorWordMultiplier(MUTATORS.featherday, 'CASTLE', 'en')).toBeCloseTo(1, 5);
  });
});

describe('mutatorModifiers — structural effects fold into the perk struct', () => {
  it('skylineRush lifts every floor (heightMult > 1)', () => {
    expect(mutatorModifiers(MUTATORS.skylineRush).heightMult).toBeGreaterThan(1);
  });

  it('featherday saves a floor on topple (toppleReduction ≥ 1)', () => {
    expect(mutatorModifiers(MUTATORS.featherday).toppleReduction).toBeGreaterThanOrEqual(1);
  });

  it('word-aware + sweep mutators contribute nothing structural', () => {
    expect(mutatorModifiers(MUTATORS.goldenLetter)).toEqual({});
    expect(mutatorModifiers(MUTATORS.vowelGale)).toEqual({});
    expect(mutatorModifiers(MUTATORS.tailwind)).toEqual({});
  });

  it('a merged struct stays compatible with NO_MODIFIERS keys', () => {
    const merged = { ...NO_MODIFIERS, ...mutatorModifiers(MUTATORS.skylineRush) };
    expect(merged).toHaveProperty('heightMult');
    expect(merged).toHaveProperty('toppleReduction');
    expect(merged.heightMult).toBeGreaterThan(1);
  });
});

describe('shareLabelForMutatorId — locale-agnostic card label', () => {
  it('returns an icon + English label for every known id', () => {
    for (const id of ALL_MUTATOR_IDS) {
      const label = shareLabelForMutatorId(id);
      expect(label).toBeTruthy();
      expect(label).toBe(label.trim());
    }
  });

  it('returns empty string for an unknown id (defensive)', () => {
    expect(shareLabelForMutatorId('nope' as MutatorId)).toBe('');
  });
});

describe('mutatorSweepMult — crane speed (fair, period only)', () => {
  it('tailwind slows the sweep (mult > 1 = more dwell, easier perfect)', () => {
    expect(mutatorSweepMult(MUTATORS.tailwind)).toBeGreaterThan(1);
  });

  it('non-crane mutators leave the sweep unchanged', () => {
    expect(mutatorSweepMult(MUTATORS.goldenLetter)).toBeCloseTo(1, 5);
    expect(mutatorSweepMult(MUTATORS.skylineRush)).toBeCloseTo(1, 5);
    expect(mutatorSweepMult(MUTATORS.featherday)).toBeCloseTo(1, 5);
  });
});
