import { describe, expect, it } from 'vitest';
import type { Locale } from '../types';
import { buildRegistry, getLevelSourceForLevel } from '../level-source-registry';

/**
 * Regression guard: chain levels whose longest theme word exceeds the authored
 * column count used to bypass the tower-control filter entirely and dump every
 * tile into one column (he L19 produced a 29-tall single column — the "שלב 19"
 * screenshot). The board must read as a spread grid, never a tower.
 */
const AFFECTED: Array<[Locale, number]> = [
  ['he', 19], ['he', 25], ['he', 26], ['he', 27], ['he', 29],
  ['es', 17], ['es', 21], ['es', 22], ['es', 24], ['es', 26], ['es', 29],
];
const CONTROL: Array<[Locale, number]> = [
  ['en', 19], ['en', 7], ['he', 3], ['es', 5],
];

async function resolveShape(locale: Locale, level: number) {
  const registry = buildRegistry();
  const src = getLevelSourceForLevel(level, locale, registry);
  const lvl = await src.resolve(level, locale, undefined);
  const heights = lvl.columns.map((c) => c.tiles.length);
  const total = heights.reduce((a, b) => a + b, 0);
  const nonEmpty = heights.filter((h) => h > 0).length;
  const tallest = Math.max(...heights);
  const tallestShare = tallest / total;
  return { heights, total, nonEmpty, tallest, tallestShare, columns: lvl.columns.length };
}

function assertSpread(s: Awaited<ReturnType<typeof resolveShape>>, label: string) {
  const ctx = `${label} heights=${JSON.stringify(s.heights)}`;
  expect(s.tallestShare, `${ctx} — one column hoards ${Math.round(s.tallestShare * 100)}%`).toBeLessThanOrEqual(0.55);
  expect(s.nonEmpty, `${ctx} — only ${s.nonEmpty} non-empty columns`).toBeGreaterThanOrEqual(Math.min(s.columns, 4));
}

describe('blast v2 chain boards never collapse into a tower', () => {
  for (const [locale, level] of AFFECTED) {
    it(`${locale} L${level}: tiles spread, no single tall stack`, async () => {
      assertSpread(await resolveShape(locale, level), `${locale} L${level}`);
    }, 60_000);
  }
  for (const [locale, level] of CONTROL) {
    it(`${locale} L${level} (control): healthy spread board`, async () => {
      assertSpread(await resolveShape(locale, level), `${locale} L${level}`);
    }, 60_000);
  }
});
