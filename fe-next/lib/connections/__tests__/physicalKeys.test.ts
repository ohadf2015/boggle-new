import { describe, it, expect } from 'vitest';
import { letterFromKeyEvent } from '../physicalKeys';
import { getKeyboardLetters } from '../keyboard';

describe('letterFromKeyEvent', () => {
  it('uses the typed character when it belongs to the board', () => {
    expect(letterFromKeyEvent('g', 'KeyG', 'en')).toBe('G');
    expect(letterFromKeyEvent('ש', 'KeyA', 'he')).toBe('ש');
    expect(letterFromKeyEvent('ф', 'KeyA', 'ru')).toBe('Ф');
  });

  it('trusts the character over the key position on remapped Latin layouts', () => {
    // AZERTY: the KeyQ position types "a".
    expect(letterFromKeyEvent('a', 'KeyQ', 'en')).toBe('A');
  });

  it('maps a Hebrew board by key position when the OS layout is English', () => {
    expect(letterFromKeyEvent('a', 'KeyA', 'he')).toBe('ש');
    expect(letterFromKeyEvent('e', 'KeyE', 'he')).toBe('ק');
    expect(letterFromKeyEvent(',', 'Comma', 'he')).toBe('ת');
    // Sofit positions fold to the base letter, like typed sofits do.
    expect(letterFromKeyEvent('o', 'KeyO', 'he')).toBe('מ');
    expect(letterFromKeyEvent('.', 'Period', 'he')).toBe('צ');
    expect(letterFromKeyEvent(';', 'Semicolon', 'he')).toBe('פ');
  });

  it('maps a Russian board by key position when the OS layout is English', () => {
    expect(letterFromKeyEvent('q', 'KeyQ', 'ru')).toBe('Й');
    expect(letterFromKeyEvent('[', 'BracketLeft', 'ru')).toBe('Х');
    expect(letterFromKeyEvent("'", 'Quote', 'ru')).toBe('Э');
    expect(letterFromKeyEvent('`', 'Backquote', 'ru')).toBe('Е');
  });

  it('maps a Latin board by key position when the OS layout is Hebrew', () => {
    expect(letterFromKeyEvent('ש', 'KeyA', 'en')).toBe('A');
    expect(letterFromKeyEvent('ת', 'Comma', 'en')).toBeNull();
  });

  it('every position-mapped letter is a key on that board', () => {
    const codes = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => `Key${c}`).concat(
      ['Comma', 'Period', 'Semicolon', 'Quote', 'BracketLeft', 'BracketRight', 'Backquote'],
    );
    for (const locale of ['en', 'he', 'ru', 'es', 'sv']) {
      const board = getKeyboardLetters(locale);
      for (const code of codes) {
        const letter = letterFromKeyEvent('Dead', code, locale);
        if (letter) expect(board).toContain(letter);
      }
    }
  });

  it('ignores non-letter keys', () => {
    expect(letterFromKeyEvent('1', 'Digit1', 'he')).toBeNull();
    expect(letterFromKeyEvent(' ', 'Space', 'en')).toBeNull();
    expect(letterFromKeyEvent('Shift', 'ShiftLeft', 'ru')).toBeNull();
  });
});
