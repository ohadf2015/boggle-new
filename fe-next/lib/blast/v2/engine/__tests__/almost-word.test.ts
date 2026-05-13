import { describe, it, expect } from 'vitest';
import { detectAlmostWords } from '../almost-word';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';
import { LOCALE_CONFIGS } from '../../locale-config';

describe('almost-word detection', () => {
  it('finds words missing exactly one letter at empty position', () => {
    const level: BlastLevel = {
      id: 'almost-1',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['X', 'O', 'G'] },
        { index: 1, tiles: ['D'] },
      ],
      words: ['DOG'],
      resolvableOrder: ['DOG'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAlmostWords(level, new Set(), LOCALE_CONFIGS.en);
    expect(result).toHaveLength(1);
    expect(result[0]!.word).toBe('DOG');
    expect(result[0]!.neededLetter).toBe('D');
    expect(result[0]!.filledCells).toEqual([cellId(0, 1), cellId(0, 2)]);
    expect(result[0]!.gapCell).toEqual({ col: 0, row: 0 });
  });

  it('skips words that already form (those are cascades, not almost-words)', () => {
    const level: BlastLevel = {
      id: 'almost-2',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['C', 'A', 'T'] },
      ],
      words: ['CAT'],
      resolvableOrder: ['CAT'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAlmostWords(level, new Set(), LOCALE_CONFIGS.en);
    expect(result).toEqual([]);
  });

  it('skips already-found words', () => {
    const level: BlastLevel = {
      id: 'almost-3',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['X', 'O', 'G'] },
        { index: 1, tiles: ['D'] },
      ],
      words: ['DOG'],
      resolvableOrder: ['DOG'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAlmostWords(level, new Set(['DOG']), LOCALE_CONFIGS.en);
    expect(result).toEqual([]);
  });

  it('skips words with 2+ missing letters (not "almost")', () => {
    const level: BlastLevel = {
      id: 'almost-4',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['X'] },
        { index: 1, tiles: ['Y'] },
        { index: 2, tiles: ['G'] },
      ],
      words: ['DOG'],
      resolvableOrder: ['DOG'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAlmostWords(level, new Set(), LOCALE_CONFIGS.en);
    expect(result).toEqual([]);
  });

  it('returns multiple almost-words across remaining word list', () => {
    const level: BlastLevel = {
      id: 'almost-5',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['X', 'A', 'T'] },
        { index: 1, tiles: ['X', 'U', 'N'] },
      ],
      words: ['CAT', 'SUN'],
      resolvableOrder: ['CAT', 'SUN'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAlmostWords(level, new Set(), LOCALE_CONFIGS.en);
    expect(result).toHaveLength(2);
    const words = result.map((a) => a.word).sort();
    expect(words).toEqual(['CAT', 'SUN']);
    const catAlmost = result.find((a) => a.word === 'CAT')!;
    expect(catAlmost.neededLetter).toBe('C');
    const sunAlmost = result.find((a) => a.word === 'SUN')!;
    expect(sunAlmost.neededLetter).toBe('S');
  });
});
