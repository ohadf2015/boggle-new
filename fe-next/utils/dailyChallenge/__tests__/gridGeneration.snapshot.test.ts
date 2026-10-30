import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateDailyPuzzle, generateDailyGrid } from '../gridGeneration';
import type { Language } from '../../../types';

const DATES = ['2026-01-01', '2026-06-15', '2026-10-30', '2027-02-28'];
const LANGS: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const FIXTURE = join(__dirname, 'fixtures', 'gridGeneration.snapshot.json');

function collect() {
  const out: Record<string, unknown> = {};
  for (const date of DATES) {
    for (const lang of LANGS) {
      const p = generateDailyPuzzle(date, lang);
      out[`${date}|${lang}`] = {
        grid: p.grid,
        targetWord: p.targetWord,
        puzzleNumber: p.puzzleNumber,
        plainGrid: generateDailyGrid(date, lang),
      };
    }
  }
  return out;
}

describe('gridGeneration determinism snapshot', () => {
  it('matches the committed fixture', () => {
    if (process.env.UPDATE_GRID_SNAPSHOT === '1') {
      writeFileSync(FIXTURE, JSON.stringify(collect(), null, 1) + '\n');
    }
    expect(collect()).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8')));
  });
});
