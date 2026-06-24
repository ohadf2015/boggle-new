import { describe, it, expect } from 'vitest';
import { cleanDefinition, isCircularClue, clueLengthOk, normalizeClue } from './clueText';

describe('cleanDefinition', () => {
  it('strips the Datamuse POS prefix and parentheticals', () => {
    expect(
      cleanDefinition('n\t(countable) One of the large bodies of water separating the continents. '),
    ).toBe('One of the large bodies of water separating the continents');
  });
  it('strips a leading article', () => {
    expect(cleanDefinition('n\tA blue colour, like that of the ocean')).toBe(
      'Blue colour, like that of the ocean',
    );
  });
  it('collapses whitespace and trims trailing period', () => {
    expect(cleanDefinition('v\tTo   move  swiftly.')).toBe('To move swiftly');
  });
});

describe('isCircularClue', () => {
  it('flags the answer appearing verbatim', () => {
    expect(isCircularClue('A large ocean body', 'ocean')).toBe(true);
  });
  it('flags a stem/derivative of the answer', () => {
    expect(isCircularClue('One who runs fast', 'running')).toBe(true);
  });
  it('passes a clean clue', () => {
    expect(isCircularClue('Atlantic or Pacific', 'ocean')).toBe(false);
  });
  // The gate must fire for non-Latin scripts too — Hebrew banks were ~20% circular because the
  // old /[a-z]+/ tokenizer matched zero Hebrew characters and silently passed everything.
  it('flags a Hebrew answer that appears verbatim in its clue', () => {
    expect(isCircularClue('רחב; גדול', 'רחב')).toBe(true);
    expect(isCircularClue('כעס; זעם', 'כעס')).toBe(true);
  });
  it('passes a clean Hebrew clue', () => {
    expect(isCircularClue('צבע השמיים', 'כחול')).toBe(false);
  });
  it('flags a Spanish answer with accents appearing in its clue', () => {
    expect(isCircularClue('león; el rey', 'león')).toBe(true);
  });
});

describe('clueLengthOk', () => {
  it('rejects clues over the cap', () => {
    expect(clueLengthOk('x'.repeat(80))).toBe(false);
  });
  it('accepts a tight clue', () => {
    expect(clueLengthOk('Atlantic or Pacific')).toBe(true);
  });
  it('rejects empty', () => {
    expect(clueLengthOk('')).toBe(false);
  });
});

describe('normalizeClue', () => {
  it('sentence-cases and trims', () => {
    expect(normalizeClue('  swift  ocean current ')).toBe('Swift ocean current');
  });
});
