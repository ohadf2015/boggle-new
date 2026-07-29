// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { generateLetters } from '../letterSource';
import type { TargetWord } from '../types';

const targets = (words: string[]): TargetWord[] => words.map((word) => ({ word }));

describe('generateLetters', () => {
  it('forced mode returns the exact letters provided', () => {
    const letters = generateLetters({
      size: 3,
      letterSource: 'forced',
      letters: ['א', 'ש', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'],
      traversal: 'anytap',
      targets: targets(['אש']),
    });
    expect(letters).toEqual(['א', 'ש', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח']);
  });

  it('pangram mode covers every target letter at least once', () => {
    const letters = generateLetters({
      size: 4,
      letterSource: 'pangram',
      traversal: 'anytap',
      targets: targets(['אש', 'אבא']),
    });
    expect(letters).toContain('א');
    expect(letters).toContain('ש');
    expect(letters).toContain('ב');
    expect(letters).toHaveLength(16);
  });

  it('pool mode covers all target letters and fills with HE letters', () => {
    const letters = generateLetters({
      size: 3,
      letterSource: 'pool',
      themeBias: 'kitchen',
      traversal: 'anytap',
      targets: targets(['אש']),
    });
    expect(letters).toHaveLength(9);
    expect(letters).toContain('א');
    expect(letters).toContain('ש');
    letters.forEach((ch) => expect(ch.length).toBe(1));
  });

  it('forced mode throws when letter count does not match size*size', () => {
    expect(() =>
      generateLetters({
        size: 3,
        letterSource: 'forced',
        letters: ['א', 'ש'],
        traversal: 'anytap',
        targets: targets(['אש']),
      }),
    ).toThrow(/letter count/);
  });
});
