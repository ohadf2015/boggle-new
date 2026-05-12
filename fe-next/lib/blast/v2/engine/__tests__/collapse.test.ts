import { describe, it, expect } from 'vitest';
import { collapseCells } from '../collapse';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';

const makeLevel = (): BlastLevel => ({
  id: 'collapse-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['A', 'B', 'C'] },
    { index: 1, tiles: ['D', 'E', 'F'] },
    { index: 2, tiles: ['G', 'H', 'I'] },
  ],
  words: ['ABC'],
  resolvableOrder: ['ABC'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
});

describe('gravity collapse', () => {
  it('H-row pop: tiles above shift down', () => {
    const level = makeLevel();
    const result = collapseCells(level, [cellId(0, 1), cellId(1, 1), cellId(2, 1)]);
    expect(result.level.columns[0]!.tiles).toEqual(['A', 'C']);
    expect(result.level.columns[1]!.tiles).toEqual(['D', 'F']);
    expect(result.level.columns[2]!.tiles).toEqual(['G', 'I']);
  });

  it('V-word pop: column compacts, flags remap', () => {
    const level = {
      ...makeLevel(),
      tileFlags: { [cellId(0, 2)]: ['coin'] },
    };
    const result = collapseCells(level, [cellId(0, 0), cellId(0, 1)]);
    expect(result.level.columns[0]!.tiles).toEqual(['C']);
    expect(result.level.tileFlags[cellId(0, 0)]).toEqual(['coin']);
  });

  it('frozen tile adjacent to pop is thawed', () => {
    const level = {
      ...makeLevel(),
      tileFlags: { [cellId(1, 1)]: ['frozen'] },
    };
    const result = collapseCells(level, [cellId(0, 1)]);
    expect(result.thawedCells).toContain(cellId(1, 1));
    expect(result.level.tileFlags[cellId(1, 1)]).not.toEqual(['frozen']);
  });

  it('frozen tile not adjacent is retained', () => {
    const level = {
      ...makeLevel(),
      tileFlags: { [cellId(0, 0)]: ['frozen'] },
    };
    const result = collapseCells(level, [cellId(1, 1)]);
    expect(result.thawedCells).not.toContain(cellId(0, 0));
    expect(result.level.tileFlags[cellId(0, 0)]).toEqual(['frozen']);
  });

  it('lateral-slide gravity: single-tile column slides to empty neighbor', () => {
    const level = {
      ...makeLevel(),
      gravityMode: 'lateral-slide' as const,
      columns: [
        { index: 0, tiles: ['A', 'B'] },
        { index: 1, tiles: ['X'] },
        { index: 2, tiles: ['Y'] },
      ],
    };
    // Pop column 0 to make it empty, then slide col 1 into it
    const result = collapseCells(level, [cellId(0, 0), cellId(0, 1)]);
    const col0 = result.level.columns.find((c) => c.index === 0)!;
    const col1 = result.level.columns.find((c) => c.index === 1)!;
    const col2 = result.level.columns.find((c) => c.index === 2)!;
    expect(col0.tiles).toEqual(['X']);
    expect(col1.tiles).toEqual([]);
    expect(col2.tiles).toEqual(['Y']);
    expect(result.slidCells).toEqual([{ from: cellId(1, 0), to: cellId(0, 0) }]);
  });
});
