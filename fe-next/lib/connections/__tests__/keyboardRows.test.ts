import { describe, it, expect } from 'vitest';
import {
  getKeyboardRows,
  getKeyboardLetters,
  bridgeSlotCount,
  normalizeTypedChar,
} from '../keyboard';

describe('getKeyboardRows', () => {
  it('returns 3 QWERTY rows for English covering exactly A–Z', () => {
    const rows = getKeyboardRows('en');
    expect(rows).toHaveLength(3);
    expect(rows[0].join('')).toBe('QWERTYUIOP');
    expect(rows[1].join('')).toBe('ASDFGHJKL');
    expect(rows[2].join('')).toBe('ZXCVBNM');
    const flat = rows.flat();
    expect(new Set(flat).size).toBe(26);
    expect(flat.sort().join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('uses QWERTY rows for es and sv (diacritics are folded at guess time)', () => {
    expect(getKeyboardRows('es')).toEqual(getKeyboardRows('en'));
    expect(getKeyboardRows('sv')).toEqual(getKeyboardRows('en'));
  });

  it('returns standard-layout Hebrew rows with all 22 base letters and no sofit glyphs', () => {
    const rows = getKeyboardRows('he');
    expect(rows).toHaveLength(3);
    const flat = rows.flat();
    expect(flat).toHaveLength(22);
    expect(new Set(flat).size).toBe(22);
    const sofits = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const sofit of sofits) expect(flat).not.toContain(sofit);
    // Familiar physical-keyboard positions: ק starts the top row, ש starts the home row.
    expect(rows[0][0]).toBe('ק');
    expect(rows[1][0]).toBe('ש');
  });

  it('returns ЙЦУКЕН rows for Russian with all 32 letters (no Ё)', () => {
    const rows = getKeyboardRows('ru');
    expect(rows).toHaveLength(3);
    const flat = rows.flat();
    expect(flat).toHaveLength(32);
    expect(new Set(flat).size).toBe(32);
    expect(flat).not.toContain('Ё');
    expect(rows[0][0]).toBe('Й');
    expect(rows[1][0]).toBe('Ф');
  });

  it('keeps getKeyboardLetters as the flattened row set (back-compat)', () => {
    for (const locale of ['en', 'he', 'ru', 'es', 'sv']) {
      expect(getKeyboardLetters(locale)).toEqual(getKeyboardRows(locale).flat());
    }
  });
});

describe('bridgeSlotCount', () => {
  it('counts plain letters', () => {
    expect(bridgeSlotCount('VINE')).toBe(4);
  });

  it('does NOT depluralize — GLASS keeps 5 slots', () => {
    expect(bridgeSlotCount('GLASS')).toBe(5);
  });

  it('folds diacritics without changing length', () => {
    expect(bridgeSlotCount('sång')).toBe(4);
  });

  it('ignores punctuation and spaces', () => {
    expect(bridgeSlotCount("o'clock")).toBe(6);
  });

  it('counts Hebrew with sofit normalization keeping length', () => {
    expect(bridgeSlotCount('שולחן')).toBe(5);
  });
});

describe('normalizeTypedChar', () => {
  it('uppercases Latin letters for en/es/sv', () => {
    expect(normalizeTypedChar('q', 'en')).toBe('Q');
    expect(normalizeTypedChar('N', 'es')).toBe('N');
  });

  it('folds physical-keyboard sofit glyphs to base letters for Hebrew', () => {
    expect(normalizeTypedChar('ם', 'he')).toBe('מ');
    expect(normalizeTypedChar('ך', 'he')).toBe('כ');
    expect(normalizeTypedChar('ב', 'he')).toBe('ב');
  });

  it('folds ё to Е for Russian and uppercases Cyrillic', () => {
    expect(normalizeTypedChar('ё', 'ru')).toBe('Е');
    expect(normalizeTypedChar('й', 'ru')).toBe('Й');
  });

  it('folds Latin diacritics to base letters (å → A) for sv/es', () => {
    expect(normalizeTypedChar('å', 'sv')).toBe('A');
    expect(normalizeTypedChar('ñ', 'es')).toBe('N');
  });

  it('rejects characters outside the locale letter set', () => {
    expect(normalizeTypedChar('1', 'en')).toBeNull();
    expect(normalizeTypedChar('!', 'he')).toBeNull();
    expect(normalizeTypedChar('q', 'he')).toBeNull();
    expect(normalizeTypedChar('', 'en')).toBeNull();
    expect(normalizeTypedChar('ab', 'en')).toBeNull();
  });
});
