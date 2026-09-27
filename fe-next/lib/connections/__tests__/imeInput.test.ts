import { describe, it, expect } from 'vitest';
import { localeNeedsIME, getKeyboardLetters } from '../keyboard';
import { checkGuess } from '../gameLogic';
import type { ConnectionPuzzle } from '../types';

describe('localeNeedsIME — which locales need a native IME instead of on-screen keys', () => {
  it('Japanese needs an IME (kanji cannot live on a finite on-screen keyboard)', () => {
    expect(localeNeedsIME('ja')).toBe(true);
  });
  it('Latin/Hebrew/Cyrillic locales do NOT need an IME (on-screen keyboard suffices)', () => {
    for (const l of ['en', 'he', 'es', 'sv', 'ru']) expect(localeNeedsIME(l)).toBe(false);
  });
});

describe('Russian on-screen keyboard', () => {
  it('exposes the 32 Cyrillic base letters (ё folds to е in matching, like sofit)', () => {
    const letters = getKeyboardLetters('ru');
    expect(letters).toHaveLength(32);
    expect(letters).toContain('А');
    expect(letters).toContain('Я');
    expect(letters).not.toContain('Ё');
  });

  it('checkGuess folds ё→е so the base keyboard can match ё-bridges', () => {
    const ru: ConnectionPuzzle = { id: 'ru-t-1', word1: 'ТЁПЛЫЙ', bridge: 'МЁД', word2: 'ЛИПОВЫЙ', difficulty: 'easy' };
    expect(checkGuess('МЕД', ru).correct).toBe(true);
  });
});

describe('kanji bridge matching via checkGuess', () => {
  const jp: ConnectionPuzzle = { id: 'ja-e-001', word1: '日', bridge: '本', word2: '屋', difficulty: 'easy' };

  it('accepts the exact kanji the player types through their IME', () => {
    expect(checkGuess('本', jp).correct).toBe(true);
  });
  it('rejects a wrong kanji', () => {
    expect(checkGuess('車', jp).correct).toBe(false);
  });
  it('tolerates surrounding whitespace from an IME commit', () => {
    expect(checkGuess(' 本 ', jp).correct).toBe(true);
  });
});

describe('Japanese still gets the English keyboard letters as an unused fallback', () => {
  it('getKeyboardLetters never returns empty (IME path bypasses it anyway)', () => {
    expect(getKeyboardLetters('ja').length).toBeGreaterThan(0);
  });
});
