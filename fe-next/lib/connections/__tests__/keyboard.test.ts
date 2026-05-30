import { describe, it, expect } from 'vitest';
import { getKeyboardLetters, appendLetter, backspace, MAX_GUESS_LEN } from '../keyboard';

describe('connections keyboard — pure logic', () => {
  it('returns the 22 Hebrew base letters for he (no sofit forms)', () => {
    const letters = getKeyboardLetters('he');
    expect(letters).toHaveLength(22);
    expect(letters[0]).toBe('א');
    expect(letters[letters.length - 1]).toBe('ת');
    // no final/sofit glyphs
    for (const sofit of ['ך', 'ם', 'ן', 'ף', 'ץ']) {
      expect(letters).not.toContain(sofit);
    }
  });

  it('returns A–Z for non-Hebrew locales', () => {
    const letters = getKeyboardLetters('en');
    expect(letters).toHaveLength(26);
    expect(letters[0]).toBe('A');
    expect(letters[25]).toBe('Z');
  });

  it('appends a tapped letter', () => {
    expect(appendLetter('של', 'ו')).toBe('שלו');
  });

  it('caps the buffer at MAX_GUESS_LEN', () => {
    const full = 'א'.repeat(MAX_GUESS_LEN);
    expect(appendLetter(full, 'ב')).toBe(full);
    expect(MAX_GUESS_LEN).toBeGreaterThanOrEqual(8);
  });

  it('backspace removes the last char and is a no-op on empty', () => {
    expect(backspace('שלו')).toBe('של');
    expect(backspace('')).toBe('');
  });
});
