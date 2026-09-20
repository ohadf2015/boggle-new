/**
 * The level screens and the act map must never print two different numbers for
 * the same place. The map counts floors as `run.path.length`; before this the
 * level header and the intro card printed the LevelSpec slot (`lvl.level`)
 * instead, so a run standing on "FLOOR 3 OF 8" opened a card headed "LEVEL 4".
 */
import { describe, it, expect } from 'vitest';
import { runFloor } from '../runFloor';

const map = { world: 1, rows: 8, nodes: [], edges: [] };

describe('runFloor', () => {
  it('given a run standing on its third node, when the floor is read, then it is floor 3 of 8', () => {
    expect(runFloor(map, { path: ['r0l0', 'r1l0', 'r2l1'] })).toEqual({ step: 3, total: 8 });
  });

  it('given a run that has not stepped onto the map yet, when the floor is read, then there is none', () => {
    expect(runFloor(map, { path: [] })).toBeNull();
  });

  it('given no map (the old level-driven entry), when the floor is read, then there is none', () => {
    expect(runFloor(null, { path: ['r0l0'] })).toBeNull();
    expect(runFloor(map, null)).toBeNull();
  });

  it('given a path longer than the map (a replayed node), when the floor is read, then it is clamped to the last floor', () => {
    expect(runFloor(map, { path: Array.from({ length: 11 }, (_, i) => `r${i}l0`) })).toEqual({ step: 8, total: 8 });
  });
});
