import { describe, it, expect, vi } from 'vitest';
import {
  scoreBoardHeuristic,
  pickRichestBoardClient,
} from '../boardSelection';

const G = (rows: string[]) => rows.map((r) => r.split(''));

describe('scoreBoardHeuristic', () => {
  it('rewards common letters over rare ones (English)', () => {
    const common = G(['EATR', 'IONS', 'HRDL', 'CMUP']);
    const rare = G(['QXJZ', 'KVWY', 'XQZJ', 'WYKV']);
    expect(scoreBoardHeuristic(common, 'en')).toBeGreaterThan(scoreBoardHeuristic(rare, 'en'));
  });

  it('penalizes boards with no vowels', () => {
    const noVowels = G(['BCDF', 'GHJK', 'LMNP', 'QRST']);
    const balanced = G(['EATR', 'IONS', 'HRDL', 'CMUP']);
    expect(scoreBoardHeuristic(balanced, 'en')).toBeGreaterThan(scoreBoardHeuristic(noVowels, 'en'));
  });

  it('penalizes excessive duplicates of one letter', () => {
    const dupe = G(['AAAA', 'AAAA', 'AAAA', 'AAAA']);
    const varied = G(['EATR', 'IONS', 'HRDL', 'CMUP']);
    expect(scoreBoardHeuristic(varied, 'en')).toBeGreaterThan(scoreBoardHeuristic(dupe, 'en'));
  });

  it('handles Hebrew letters', () => {
    const heCommon = G(['יוהא', 'למנר', 'שתבכ', 'עדחק']);
    const heRare = G(['טטטט', 'ץץץץ', 'ףףףף', 'ךךךך']);
    expect(scoreBoardHeuristic(heCommon, 'he')).toBeGreaterThan(scoreBoardHeuristic(heRare, 'he'));
  });
});

describe('pickRichestBoardClient', () => {
  it('returns the highest-scoring grid from k candidates', () => {
    const grids = [G(['XX', 'XX']), G(['EA', 'TR']), G(['QQ', 'QQ'])];
    const generate = vi.fn(() => grids.shift()!);
    const result = pickRichestBoardClient(generate, 'en', 3);
    expect(result).toEqual(G(['EA', 'TR']));
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('handles k=1 without scoring', () => {
    const grids = [G(['EA', 'TR'])];
    const generate = vi.fn(() => grids.shift()!);
    const result = pickRichestBoardClient(generate, 'en', 1);
    expect(result).toEqual(G(['EA', 'TR']));
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
