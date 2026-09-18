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
