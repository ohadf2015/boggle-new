import { describe, it, expect } from 'vitest';
import { selectCascadeTelegraph } from '../cascade-telegraph';
import { cellId } from '../cell-id';
import { LOCALE_CONFIGS } from '../../locale-config';
import type { BlastLevel } from '../../types';

// Board where DOG is directly formable across the bottom row.
//   c0r0=D, c1r0=O, c2r0=G
const level: BlastLevel = {
  id: 'telegraph-test',
  levelNumber: 8,
  locale: 'en',
  theme: 'animals',
  columns: [
    { index: 0, tiles: ['D'] },
    { index: 1, tiles: ['O'] },
    { index: 2, tiles: ['G'] },
  ],
  words: ['DOG'],
  resolvableOrder: ['DOG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 8,
};
const cfg = LOCALE_CONFIGS.en;

describe('selectCascadeTelegraph', () => {
  it('returns the cells of a newly-formable theme word after a cascade (chainDepth > 0)', () => {
    const cells = selectCascadeTelegraph(level, new Set<string>(), cfg, 1);
    expect(cells).toEqual([cellId(0, 0), cellId(1, 0), cellId(2, 0)]);
  });

  it('returns nothing when the last move triggered no cascade (chainDepth <= 0)', () => {
    expect(selectCascadeTelegraph(level, new Set<string>(), cfg, 0)).toEqual([]);
  });

  it('returns nothing once every theme word is already found', () => {
    const cells = selectCascadeTelegraph(level, new Set(['DOG']), cfg, 1);
    expect(cells).toEqual([]);
  });
});
