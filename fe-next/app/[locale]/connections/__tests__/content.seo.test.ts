import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANDING_LOCALES, getConnectionsLandingCopy } from '../content';
import { getPuzzlesForLocale } from '@/lib/connections/puzzles';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';

const norm = (s: string): string => s.toLocaleLowerCase().replace(/[\s\-·]/g, '');

function isPoolPuzzle(locale: string, p: { word1: string; bridge: string; word2: string }): boolean {
  return getPuzzlesForLocale(locale).some(
    (row) =>
      norm(row.word1) === norm(p.word1) &&
      norm(row.bridge) === norm(p.bridge) &&
      norm(row.word2) === norm(p.word2),
  );
}

describe.each([...SUPPORTED_LANDING_LOCALES])('connections landing copy (%s)', (locale) => {
  const c = getConnectionsLandingCopy(locale);

  it('keeps the search snippet inside what Google shows', () => {
    expect(c.metaTitle.length, c.metaTitle).toBeLessThanOrEqual(60);
    expect(c.metaTitle.endsWith('| LexiClash')).toBe(true);
    expect(c.metaDescription.length, c.metaDescription).toBeLessThanOrEqual(155);
  });

  it('shows only puzzles that exist in the live pool', () => {
    const shown = [c.demo.puzzle, ...c.samples.items, ...c.howTo.examples];
    for (const p of shown) {
      expect(isPoolPuzzle(locale, p), `${p.word1} · ${p.bridge} · ${p.word2}`).toBe(true);
    }
  });

  it('labels each sample with its pool difficulty', () => {
    for (const p of c.samples.items) {
      const row = getPuzzlesForLocale(locale).find(
        (r) => norm(r.word1) === norm(p.word1) && norm(r.bridge) === norm(p.bridge) && norm(r.word2) === norm(p.word2),
      );
      expect(row?.difficulty, `${p.word1} · ${p.bridge} · ${p.word2}`).toBe(p.difficulty);
    }
  });

  it('spells out both halves of every how-to example', () => {
    expect(c.howTo.steps.length).toBe(3);
    expect(c.howTo.examples.length).toBeGreaterThanOrEqual(2);
    for (const ex of c.howTo.examples) {
      expect(norm(ex.left)).toBe(norm(ex.word1 + ex.bridge));
      expect(norm(ex.right)).toBe(norm(ex.bridge + ex.word2));
    }
  });

  it('links only to modes this locale can play', () => {
    const keys = c.modes.items.map((m) => m.key);
    expect(keys).toEqual(expect.arrayContaining(['play', 'daily', 'community']));
    expect(keys.includes('pyramid')).toBe(getPyramidsForLocale(locale).length > 0);
    for (const m of c.modes.items) {
      expect(m.title.trim()).toBeTruthy();
      expect(m.body.trim()).toBeTruthy();
    }
  });

  it('answers 5 to 7 questions', () => {
    expect(c.faq.items.length).toBeGreaterThanOrEqual(5);
    expect(c.faq.items.length).toBeLessThanOrEqual(7);
  });

  it('never promises a hint on every puzzle (one free hint a day)', () => {
    const hintClaims = c.faq.items.map((f) => f.a.toLowerCase()).join('\n');
    expect(hintClaims).not.toMatch(
      /(hint|רמז|pista|подсказ|ヒント|ledtråd)[^.。\n]*(per puzzle|בכל חידה|por acertijo|на загадку|一問につき|varje (gåta|pussel))/,
    );
  });
});
