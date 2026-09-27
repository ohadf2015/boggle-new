import { describe, it, expect } from 'vitest';
import { collapseCells, rebuildTileIds } from '../collapse';
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

describe('collapseCells rowRemapByCol', () => {
  it('maps each surviving tile old-row to its post-collapse row', () => {
    const level: BlastLevel = {
      id: 'remap-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A', 'B', 'C', 'D'] },
        { index: 1, tiles: ['E', 'F'] },
      ],
      words: [],
      resolvableOrder: [],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = collapseCells(level, [cellId(0, 0), cellId(0, 2)]);

    const col0 = result.rowRemapByCol.get(0)!;
    expect(col0.get(1)).toBe(0);
    expect(col0.get(3)).toBe(1);
    expect(col0.has(0)).toBe(false);
    expect(col0.has(2)).toBe(false);

    const col1 = result.rowRemapByCol.get(1)!;
    expect(col1.get(0)).toBe(0);
    expect(col1.get(1)).toBe(1);
  });
});

describe('rebuildTileIds', () => {
  it('keeps surviving tile ids attached as they fall (standard gravity)', () => {
    const level: BlastLevel = {
      id: 'rebuild-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A', 'B', 'C', 'D'] },
        { index: 1, tiles: ['E'] },
      ],
      words: [],
      resolvableOrder: [],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const tileIds = [['a', 'b', 'c', 'd'], ['e']];
    const collapse = collapseCells(level, [cellId(0, 0), cellId(0, 2)]);

    const next = rebuildTileIds(level.columns, tileIds, collapse);

    expect(next[0]).toEqual(['b', 'd']);
    expect(next[1]).toEqual(['e']);
  });

  it('moves a tile id across columns on a lateral slide', () => {
    const level: BlastLevel = {
      id: 'rebuild-slide-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A', 'B'] },
        { index: 1, tiles: ['C'] },
      ],
      words: [],
      resolvableOrder: [],
      tileFlags: {},
      gravityMode: 'lateral-slide',
      difficulty: 1,
    };
    const tileIds = [['a', 'b'], ['c']];
    const collapse = collapseCells(level, [cellId(0, 0), cellId(0, 1)]);

    const next = rebuildTileIds(level.columns, tileIds, collapse);

    expect(next[0]).toEqual(['c']);
    expect(next[1]).toEqual([]);
  });

  it('surviving tile ids keep their identity and shift to new positions after collapse', () => {
    const level: BlastLevel = {
      id: 'tile-stability-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['C', 'A', 'T'] },
        { index: 1, tiles: ['X', 'Y'] },
      ],
      words: ['CAT'],
      resolvableOrder: ['CAT'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const tileIds = [['t-0-0', 't-0-1', 't-0-2'], ['t-1-0', 't-1-1']];

    // Pop the bottom of column 0 (the C at c0r0).
    const collapse = collapseCells(level, [cellId(0, 0)]);
    const newIds = rebuildTileIds(level.columns, tileIds, collapse);

    // Column 0 was [C,A,T]; after popping C at row 0: [A,T] -> their ids t-0-1, t-0-2 survive at rows 0,1.
    expect(newIds[0]).toEqual(['t-0-1', 't-0-2']);
    // Column 1 untouched.
    expect(newIds[1]).toEqual(['t-1-0', 't-1-1']);
    // Popped tile id is gone.
    expect(newIds.flat()).not.toContain('t-0-0');
  });
});
