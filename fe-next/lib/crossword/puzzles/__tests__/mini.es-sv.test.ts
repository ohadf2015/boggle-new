import { describe, it, expect } from 'vitest';
import { getPool } from '../index';
import { isRealCrossword } from '../../templates';
import esBank from '../../data/clueBank.es.json';
import esCurated from '../../data/clueBank.es.curated.json';
import svBank from '../../data/clueBank.sv.json';
import jaBank from '../../data/clueBank.ja.json';
import ruBase from '../../data/clueBank.ru.json';
import ruCurated from '../../data/clueBank.ru.curated.json';
import { getGameModeRules } from '@/backend/modes/rules';
import type { PuzzleLocale } from '../../types';

const BANKS = { es: { ...esBank, ...esCurated }, sv: svBank, ja: jaBank, ru: { ...ruBase, ...ruCurated } } as Record<string, Record<string, { clue: string }>>;

const MIN_PUZZLES = { es: 10, ru: 10, sv: 5, ja: 5 } as const;

describe.each(['es', 'sv', 'ja', 'ru'] as const)('%s mini pool', (locale) => {
  const pool = getPool(locale);
  const min = MIN_PUZZLES[locale];

  const enabled = (getGameModeRules('crossword').languages ?? []).includes(locale);

  it(`has at least ${min} generated puzzles of its own locale`, () => {
    expect(pool.filter((p) => p.locale === locale).length).toBeGreaterThanOrEqual(min);
  });

  it.skipIf(!enabled)(`has at least ${min} generated puzzles of its own locale`, () => {
    expect(pool.length).toBeGreaterThanOrEqual(min);
    expect(pool.every((p) => p.locale === locale && p.source === 'generated')).toBe(true);
  });

  it.skipIf(!enabled)('no two puzzles share 3+ answers', () => {
    const sets = pool.map((p) => new Set(p.slots.map((s) => s.answer)));
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const shared = [...sets[i]].filter((a) => sets[j].has(a)).length;
        expect(shared, `${pool[i].id} vs ${pool[j].id}`).toBeLessThan(3);
      }
    }
  });

  it('has unique ids', () => {
    expect(new Set(pool.map((p) => p.id)).size).toBe(pool.length);
  });

  it('every slot answer is a clue-bank word carrying exactly its bank clue', () => {
    for (const p of pool) {
      for (const s of p.slots) {
        expect(s.clue.length).toBeGreaterThan(0);
        expect(BANKS[locale][s.answer]?.clue).toBe(s.clue);
      }
    }
  });

  it('every grid is a real LTR crossword', () => {
    for (const p of pool) {
      const grid = Array.from({ length: p.size }, (_, r) =>
        Array.from({ length: p.size }, (_, c) => {
          const cell = p.cells[r * p.size + c];
          return cell.block ? null : cell.solution;
        }),
      );
      expect(p.rtl).toBe(false);
      expect(isRealCrossword(grid, false)).toBe(true);
    }
  });
});

describe('ja mini pool', () => {
  it('stores grid letters as full-size hiragana (small kana folded, ー allowed)', () => {
    for (const p of getPool('ja')) {
      for (const c of p.cells) if (!c.block) expect(c.solution, p.id).toMatch(/^[あいうえおか-ぢつ-もやゆよ-ろわをんー]$/);
    }
  });
});

describe('crossword locale gate', () => {
  it('every locale enabled for the crossword mode has its own non-empty puzzle pool', () => {
    const languages = getGameModeRules('crossword').languages ?? [];
    expect(languages.length).toBeGreaterThan(0);
    for (const lang of languages) {
      const pool = getPool(lang as PuzzleLocale);
      expect(pool.length, lang).toBeGreaterThan(0);
      expect(pool.every((p) => p.locale === lang), lang).toBe(true);
    }
  });

  it('a locale without puzzles of its own is not enabled for the mode', () => {
    expect(getPool('fr' as PuzzleLocale).every((p) => p.locale !== 'fr')).toBe(true);
    expect(getGameModeRules('crossword').languages).not.toContain('fr');
  });
});
