import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { themeArt, THEME_ART_KEYS } from '../themeArt';

const PUBLIC_THEMES = join(process.cwd(), 'public', 'themes');

describe('themeArt', () => {
  it('maps a known theme to its chip svg path', () => {
    expect(themeArt('animals')).toBe('/themes/animals.svg');
    expect(themeArt('space')).toBe('/themes/space.svg');
    expect(themeArt('food')).toBe('/themes/food.svg');
  });

  it('falls back to the neutral chip for unknown themes', () => {
    // Procedurally generated levels can carry novel theme ids.
    expect(themeArt('quux-generated-9000')).toBe('/themes/onboarding.svg');
  });

  it('falls back for null/undefined/empty theme', () => {
    expect(themeArt(undefined)).toBe('/themes/onboarding.svg');
    expect(themeArt(null)).toBe('/themes/onboarding.svg');
    expect(themeArt('')).toBe('/themes/onboarding.svg');
  });

  it('ships a real svg file for every theme key', () => {
    const missing = THEME_ART_KEYS.filter(
      (k) => !existsSync(join(PUBLIC_THEMES, `${k}.svg`))
    );
    expect(missing).toEqual([]);
  });

  it('keeps the whole chip set inside the 400KB art budget', () => {
    const total = readdirSync(PUBLIC_THEMES)
      .filter((f) => f.endsWith('.svg'))
      .reduce((n, f) => n + readFileSync(join(PUBLIC_THEMES, f)).byteLength, 0);
    expect(total).toBeLessThan(400 * 1024);
  });

  it('ships no emoji inside the chip artwork', () => {
    // The whole point of the chip set is that Wordfall renders zero emoji.
    const emoji = /\p{Extended_Pictographic}/u;
    const offenders = readdirSync(PUBLIC_THEMES)
      .filter((f) => f.endsWith('.svg'))
      .filter((f) => emoji.test(readFileSync(join(PUBLIC_THEMES, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
