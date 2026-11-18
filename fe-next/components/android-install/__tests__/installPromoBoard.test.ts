import { describe, expect, it } from 'vitest';
import { installPromoBoard } from '../installPromoBoard';

const SCRIPT: Record<string, RegExp> = {
  en: /^[A-Z]$/,
  he: /^[֐-׿]$/,
  sv: /^[A-ZÅÄÖ]$/,
  ja: /^[぀-ゟ]$/,
  es: /^[A-ZÑ]$/,
  ru: /^[А-ЯЁ]$/,
};

describe('installPromoBoard', () => {
  it.each(Object.keys(SCRIPT))('spells a connected word in %s using that language\'s letters', (locale) => {
    const { letters, path, word } = installPromoBoard(locale);
    expect(letters).toHaveLength(16);
    for (const letter of letters) expect(letter).toMatch(SCRIPT[locale]);
    expect(path.map((i) => letters[i]).join('')).toBe(word);
    expect(new Set(path).size).toBe(path.length);
    path.slice(1).forEach((cell, i) => {
      const prev = path[i];
      expect(Math.abs((cell % 4) - (prev % 4))).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.floor(cell / 4) - Math.floor(prev / 4))).toBeLessThanOrEqual(1);
    });
  });

  it('falls back to English for an unknown locale', () => {
    expect(installPromoBoard('xx').word).toBe(installPromoBoard('en').word);
  });
});
