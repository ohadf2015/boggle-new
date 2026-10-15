import { describe, it, expect } from 'vitest';
import { generateRandomTable as serverTable } from '@/backend/utils/gameUtils';
import { generateRandomTable as clientTable } from '@/utils/utils';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language, LetterGrid } from '@/shared/types';

type Pos = { r: number; c: number };

/** Every adjacent, non-repeating path that spells `word` on the board. */
function pathsFor(grid: LetterGrid, word: string, language: Language): Pos[][] {
  const target = normalizeWord(word, language);
  const rows = grid.length;
  const cols = grid[0].length;
  const out: Pos[][] = [];
  const walk = (r: number, c: number, i: number, path: Pos[], seen: Set<string>) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || seen.has(`${r},${c}`)) return;
    if (normalizeWord(String(grid[r][c]), language) !== target[i]) return;
    const next = [...path, { r, c }];
    if (i === target.length - 1) { out.push(next); return; }
    seen.add(`${r},${c}`);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) walk(r + dr, c + dc, i + 1, next, seen);
    seen.delete(`${r},${c}`);
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) walk(r, c, 0, [], new Set());
  return out;
}

const straight = (p: Pos[]) => p.every((q, i) => i < 2 || (q.r - p[i - 1].r === p[1].r - p[0].r && q.c - p[i - 1].c === p[1].c - p[0].c));

type Generator = (rows: number, cols: number, language: Language, words: string[]) => LetterGrid;

function seedingStats(generate: Generator, language: Language, words: string[], boards = 80) {
  let findable = 0;
  let onlyStraight = 0;
  for (let i = 0; i < boards; i++) {
    const grid = generate(6, 6, language, words);
    for (const w of words) {
      const paths = pathsFor(grid, w, language);
      if (paths.length === 0) continue;
      findable++;
      if (paths.every(straight)) onlyStraight++;
    }
  }
  return { findable: findable / (boards * words.length), straightShare: onlyStraight / Math.max(1, findable) };
}

const GENERATORS: Array<[string, Generator]> = [
  ['server deal (classroom rounds)', serverTable as Generator],
  ['client deal (arcade host fallback)', clientTable as Generator],
];

/** The "Common English" starter pack — the list a teacher runs in one tap. */
const COMMON_ENGLISH = ['HOUSE', 'WATER', 'LIGHT', 'EARTH', 'PLANT', 'SLEEP', 'DREAM', 'HEART', 'VOICE', 'SMILE', 'STONE', 'RIVER', 'BRIDGE', 'GARDEN', 'WINTER', 'ISLAND', 'FOREST', 'SHADOW', 'MIRROR', 'CASTLE', 'DESERT', 'SILVER', 'TRAVEL', 'SUNSET', 'PUZZLE', 'THUNDER', 'WHISPER', 'HARVEST', 'JOURNEY', 'CRYSTAL'];

describe.each(GENERATORS)('lesson words seeded by the %s', (_name, generate) => {
  it('GIVEN an English lesson WHEN the board is dealt THEN the words stay findable but are not laid in straight rows', () => {
    const { findable, straightShare } = seedingStats(generate, 'en', ['GARDEN', 'BRIDGE', 'WINTER', 'ISLAND', 'FOREST']);
    expect(findable).toBeGreaterThan(0.9);
    expect(straightShare).toBeLessThan(0.03);
  });

  it('GIVEN the 30-word Common English pack WHEN dealt THEN planted words bend instead of filling rows and columns', () => {
    const { straightShare } = seedingStats(generate, 'en', COMMON_ENGLISH, 40);
    expect(straightShare).toBeLessThan(0.03);
  });

  it('GIVEN a Hebrew lesson with final letters WHEN dealt THEN the words are findable and bend', () => {
    const { findable, straightShare } = seedingStats(generate, 'he', ['שולחן', 'מחברת', 'עיפרון', 'חלון', 'תלמיד']);
    expect(findable).toBeGreaterThan(0.9);
    expect(straightShare).toBeLessThan(0.03);
  });
});
