import { describe, it, expect } from 'vitest';
import { DEFAULT_PLAYER_NAMES, isDefaultPlayerName } from '../defaultPlayerNames';
import { BOT_CONFIG } from '@/backend/modules/botConfig';
import { FALLBACK_NAMES_BY_LANG } from '@/contexts/auth/authUtils';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

type Catalogue = { joinView?: { defaultPlayerNames?: string[] } };

describe('DEFAULT_PLAYER_NAMES stays in step with every name generator', () => {
  const catalogues: Record<string, Catalogue> = { en, he, sv, ja, es, ru } as Record<string, Catalogue>;

  it.each(Object.keys(catalogues))('covers joinView.defaultPlayerNames in %s', (lang) => {
    const names = catalogues[lang].joinView?.defaultPlayerNames ?? [];
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !isDefaultPlayerName(n))).toEqual([]);
  });

  it('covers the /api/random-name pool (BOT_CONFIG.PLAYER_NAMES)', () => {
    const names = Object.values(BOT_CONFIG.PLAYER_NAMES).flat().map((e) => e.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !isDefaultPlayerName(n))).toEqual([]);
  });

  it('covers the offline fallback names', () => {
    const names = Object.values(FALLBACK_NAMES_BY_LANG).flat();
    expect(names.filter((n) => !isDefaultPlayerName(n))).toEqual([]);
  });

  it('has no duplicates', () => {
    expect(new Set(DEFAULT_PLAYER_NAMES).size).toBe(DEFAULT_PLAYER_NAMES.length);
  });
});

describe('isDefaultPlayerName', () => {
  it('spots a generated name whatever the case, spacing or trailing number', () => {
    expect(isDefaultPlayerName('Sneaky Potato')).toBe(true);
    expect(isDefaultPlayerName('  sneaky   POTATO ')).toBe(true);
    expect(isDefaultPlayerName('Sneaky Potato 2')).toBe(true);
    expect(isDefaultPlayerName('דונאט שובב')).toBe(true);
    expect(isDefaultPlayerName('Player')).toBe(true);
  });

  it('leaves a chosen name alone', () => {
    expect(isDefaultPlayerName('Ohad')).toBe(false);
    expect(isDefaultPlayerName('Potato')).toBe(false);
    expect(isDefaultPlayerName('Sneaky Potato Queen')).toBe(false);
    expect(isDefaultPlayerName('')).toBe(false);
    expect(isDefaultPlayerName(null)).toBe(false);
    expect(isDefaultPlayerName(undefined)).toBe(false);
  });
});
