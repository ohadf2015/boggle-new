/**
 * Word Alchemy on-screen keyboard — pure logic.
 *
 * Replaces the free-text <input> (which forced players onto a Hebrew IME /
 * physical keyboard) with tappable letter buttons. These helpers decide which
 * letters to show and how taps mutate the in-progress guess.
 */
import { describe, it, expect } from 'vitest';
import {
  getKeyboardLetters,
  appendLetter,
  backspace,
  MAX_GUESS_LEN,
} from '../keyboard';

describe('getKeyboardLetters', () => {
  it('returns the 26 English letters for non-Hebrew locales', () => {
    const en = getKeyboardLetters('en');
    expect(en).toHaveLength(26);
    expect(en[0]).toBe('A');
    expect(en[25]).toBe('Z');
  });

  it('returns the 22 Hebrew base letters for he', () => {
    const he = getKeyboardLetters('he');
    expect(he).toHaveLength(22);
    expect(he[0]).toBe('א');
    expect(he[21]).toBe('ת');
  });

  it('never includes Hebrew sofit (final) forms — board/answers are base-form', () => {
    const he = getKeyboardLetters('he');
    for (const sofit of ['ך', 'ם', 'ן', 'ף', 'ץ']) {
      expect(he).not.toContain(sofit);
    }
  });

  it('does not mix alphabets', () => {
    expect(getKeyboardLetters('he')).not.toContain('A');
    expect(getKeyboardLetters('en')).not.toContain('א');
  });
});

describe('appendLetter / backspace', () => {
  it('appends a tapped letter', () => {
    expect(appendLetter('STA', 'R')).toBe('STAR');
    expect(appendLetter('', 'א')).toBe('א');
  });

  it('caps the guess length so input cannot run away', () => {
    const full = 'A'.repeat(MAX_GUESS_LEN);
    expect(appendLetter(full, 'B')).toBe(full); // refused at the cap
  });

  it('backspace removes the last character', () => {
    expect(backspace('STAR')).toBe('STA');
    expect(backspace('A')).toBe('');
    expect(backspace('')).toBe(''); // no-op on empty
  });
});
