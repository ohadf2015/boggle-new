import { generateWheel } from '@/lib/wordTower/wordTowerManager';
import { describe, expect, it } from 'vitest';
import { canBuildFromWheel, isAcceptedWord, spinWheel, usedLetterMask } from '../wheel';

describe('usedLetterMask', () => {
  it('marks nothing used for an empty word', () => {
    expect(usedLetterMask('', ['a', 'b'])).toEqual([false, false]);
  });

  it('consumes duplicate wheel letters left to right', () => {
    // Given a wheel with two As, when "aa" is typed, then both are used
    expect(usedLetterMask('a', ['a', 'o', 'a'])).toEqual([true, false, false]);
    expect(usedLetterMask('aa', ['a', 'o', 'a'])).toEqual([true, false, true]);
  });

  it('ignores typed letters the wheel does not have', () => {
    expect(usedLetterMask('xo', ['a', 'o'])).toEqual([false, true]);
  });
});

describe('canBuildFromWheel', () => {
  it('rejects a word needing more copies than the wheel holds', () => {
    expect(canBuildFromWheel('aa', ['a', 'b'])).toBe(false);
    expect(canBuildFromWheel('ab', ['a', 'b'])).toBe(true);
  });
});

describe('spinWheel', () => {
  it('returns letters in the same case the dictionary and typed words use', () => {
    // Given the v1 wheel generator (uppercase bags), when v2 spins a wheel
    const wheel = spinWheel('en');
    // Then every letter is lowercase, so a word typed from it is buildable
    expect(wheel.length).toBeGreaterThan(0);
    expect(wheel.every((l) => l === l.toLowerCase())).toBe(true);
    expect(canBuildFromWheel(wheel.slice(0, 3).join(''), wheel)).toBe(true);
  });
});

describe('isAcceptedWord', () => {
  // loadWordCraftDictionary stores UPPERCASE keys (addDictKeys).
  const dict = new Set(['SAD', 'ADO']);
  const wheel = ['a', 'o', 'a', 's', 'd'];

  it('accepts a lowercase typed word against the uppercase dictionary', () => {
    expect(isAcceptedWord('sad', wheel, dict)).toBe(true);
  });

  it('rejects short, unbuildable, or unknown words', () => {
    expect(isAcceptedWord('ad', wheel, dict)).toBe(false);
    expect(isAcceptedWord('sss', wheel, new Set(['SSS']))).toBe(false);
    expect(isAcceptedWord('oda', wheel, dict)).toBe(false);
  });

  it('rejects everything while the dictionary is not loaded', () => {
    expect(isAcceptedWord('sad', wheel, null)).toBe(false);
  });
});

describe('spinWheel run seed', () => {
  it('given two different runs, when spun, then the opening wheels differ', () => {
    // A constant seed opened every run on the same seven letters, so a player
    // could replay one word forever.
    const a = spinWheel('en', 0, 'run-a').join('');
    const b = spinWheel('en', 0, 'run-b').join('');
    expect(a).not.toBe(b);
  });

  it('given the same run and draw, when spun twice, then identical', () => {
    expect(spinWheel('en', 3, 'run-a')).toEqual(spinWheel('en', 3, 'run-a'));
  });
});

describe('spinWheel vowel balance', () => {
  // No ru: /api/dictionary-words has no ru list, so ru deals the en wheel (Sentry 2A8).
  const VOWELS: Record<string, string> = { en: 'aeiou', es: 'aeiou', sv: 'aeiouyåäö', he: 'אהויע' };

  for (const [lang, vowels] of Object.entries(VOWELS)) {
    it(`given many ${lang} wheels, when spun, then 2-3 vowels in every 7 letters`, () => {
      // A vowel-heavy ring (4-5 of 7) leaves too few consonants to spell with.
      for (let draw = 0; draw < 200; draw += 1) {
        const wheel = spinWheel(lang as Parameters<typeof spinWheel>[0], draw, `seed-${lang}`);
        const n = wheel.filter((l) => vowels.includes(l)).length;
        expect(n, wheel.join('')).toBeGreaterThanOrEqual(2);
        expect(n, wheel.join('')).toBeLessThanOrEqual(3);
      }
    });
  }

  it('given the v1 generator with no cap, when spun, then v1 behaviour is untouched', () => {
    expect(generateWheel('g', 'p', 'en', 0)).toEqual(generateWheel('g', 'p', 'en', 0, 7, 2));
  });
});

describe('spinWheel rare letters', () => {
  it('given many english wheels, when spun, then at most one of q/x/z/j, and a q always brings its u', () => {
    for (let draw = 0; draw < 400; draw += 1) {
      const wheel = spinWheel('en', draw, 'rare-seed');
      const rare = wheel.filter((l) => 'qxzj'.includes(l)).length;
      expect(rare, wheel.join('')).toBeLessThanOrEqual(1);
      if (wheel.includes('q')) expect(wheel, wheel.join('')).toContain('u');
    }
  });

  it('given many wheels, when spun, then no letter appears more than twice', () => {
    for (let draw = 0; draw < 200; draw += 1) {
      const wheel = spinWheel('es', draw, 'dup-seed');
      const counts = new Map<string, number>();
      for (const l of wheel) counts.set(l, (counts.get(l) ?? 0) + 1);
      expect(Math.max(...counts.values()), wheel.join('')).toBeLessThanOrEqual(2);
    }
  });
});

describe('isAcceptedWord — vulgar words never become a floor', () => {
  it('given a Hebrew slur that IS in the dictionary, when spelled, then it is refused', () => {
    const wheel = ['מ', 'ז', 'ו', 'י', 'ן', 'ג', 'ד'];
    const dict = new Set(['מזוין', 'מגדל']);
    expect(isAcceptedWord('מזוין', wheel, dict)).toBe(false);
  });

  it('given the same word with a non-final nun, then it is refused too', () => {
    expect(isAcceptedWord('מזוינ', ['מ', 'ז', 'ו', 'י', 'נ'], new Set(['מזוינ']))).toBe(false);
  });

  it('given an English swear word in the dictionary, when spelled, then it is refused', () => {
    expect(isAcceptedWord('shit', ['s', 'h', 'i', 't', 'a'], new Set(['SHIT']))).toBe(false);
  });

  it('given an ordinary word that contains a blocked one, then it is still accepted', () => {
    expect(isAcceptedWord('shitake', ['s', 'h', 'i', 't', 'a', 'k', 'e'], new Set(['SHITAKE']))).toBe(true);
  });
});
