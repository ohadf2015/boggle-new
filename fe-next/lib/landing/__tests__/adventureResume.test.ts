/**
 * Which run the homepage adventure cube offers to continue.
 */
import { describe, it, expect } from 'vitest';
import { pickAdventureResume, type StoredWorldRun } from '../adventureResume';

const run = (over: Partial<StoredWorldRun['run']> = {}): StoredWorldRun['run'] => ({
  v: 2, w: 1, step: 3, node: 'r2-1', path: ['r0-0', 'r1-1', 'r2-1'],
  hp: 4, maxHp: 6, relics: ['sharp-quill'], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 120,
  ...over,
} as StoredWorldRun['run']);

describe('pickAdventureResume', () => {
  it('has nothing to offer with no stored runs', () => {
    expect(pickAdventureResume([])).toBeNull();
  });

  it('offers a run that is under way', () => {
    expect(pickAdventureResume([{ world: 2, run: run({ w: 2 }) }])).toEqual({
      world: 2, step: 3, hp: 4, maxHp: 6, relics: ['sharp-quill'], gold: 120,
    });
  });

  it('ignores a run still on its first node — nothing has happened yet', () => {
    expect(pickAdventureResume([{ world: 1, run: run({ step: 1 }) }])).toBeNull();
  });

  it('ignores a dead run (0 HP) rather than inviting the player back into a corpse', () => {
    expect(pickAdventureResume([{ world: 1, run: run({ hp: 0 }) }])).toBeNull();
  });

  it('prefers the deepest run, then the later world, when several are stored', () => {
    const picked = pickAdventureResume([
      { world: 1, run: run({ w: 1, step: 5 }) },
      { world: 3, run: run({ w: 3, step: 7 }) },
      { world: 2, run: run({ w: 2, step: 7 }) },
    ]);
    expect(picked).toMatchObject({ world: 3, step: 7 });
  });

  it('never reports a step past the map, or negative hearts, whatever storage held', () => {
    const picked = pickAdventureResume([{ world: 1, run: run({ step: 99, hp: 3, maxHp: 2 }) }]);
    expect(picked).toMatchObject({ step: 8, hp: 2, maxHp: 2 });
  });

  it('survives a malformed stored run instead of throwing on the homepage', () => {
    const bad = [{ world: 1, run: null }, { world: 2, run: run({ w: 2 }) }] as unknown as StoredWorldRun[];
    expect(pickAdventureResume(bad)).toMatchObject({ world: 2 });
  });
});
