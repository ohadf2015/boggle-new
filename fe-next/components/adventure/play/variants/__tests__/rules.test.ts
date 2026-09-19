import { describe, it, expect } from 'vitest';
import { fogVisible, initBombs, tickBombs, defuseBombs, BOMB_PENALTY_MS } from '../rules';
import { levelThreat, ruleKeysOf, runPathState } from '../levelKinds';
import { getPlayLevel, LEVELS_PER_WORLD } from '@/lib/adventure/play/levels';
import { makeRng } from '@/lib/adventure/play/rng';

describe('fogVisible', () => {
  it('given a used path, when fog is computed, then only path tiles and their neighbours are visible', () => {
    const v = fogVisible(5, [[0, 0], [0, 1]], { start: [2, 2] });
    expect(v.has('0-0')).toBe(true);
    expect(v.has('1-2')).toBe(true);
    expect(v.has('0-3')).toBe(false);
    expect(v.has('4-4')).toBe(false);
  });

  it('given no word yet, when fog is computed, then the start tile and its neighbours are visible', () => {
    const v = fogVisible(5, null, { start: [2, 2] });
    expect(v.size).toBe(9);
    expect(v.has('2-2') && v.has('1-1') && v.has('3-3')).toBe(true);
  });

  it('given blackout, when fog is computed, then only neighbours of the LAST tile are visible', () => {
    const v = fogVisible(5, [[0, 0], [1, 1], [2, 2]], { start: [0, 0], blackout: true });
    expect(v.has('0-0')).toBe(false);
    expect(v.has('3-3')).toBe(true);
    expect(v.size).toBe(9);
  });

  it('given idle rings, when fog is computed, then the visible area grows so the board can never lock you out', () => {
    const tight = fogVisible(5, null, { start: [0, 0] });
    const wider = fogVisible(5, null, { start: [0, 0], expand: 1 });
    expect(wider.size).toBeGreaterThan(tight.size);
    expect(fogVisible(5, null, { start: [0, 0], expand: 5 }).size).toBe(25);
  });
});

describe('bombs', () => {
  it('given a board, when bombs are armed, then each sits on a distinct tile and their fuses are staggered so they never blow together', () => {
    const s = initBombs(4, 3, makeRng('b'), 20000);
    expect(s.bombs).toHaveLength(3);
    expect(new Set(s.bombs.map((b) => b.key)).size).toBe(3);
    expect(s.bombs[0].leftMs).toBe(20000);
    expect(new Set(s.bombs.map((b) => b.leftMs)).size).toBe(3);
    expect(s.bombs.every((b) => b.leftMs >= 20000 && b.leftMs === b.fuseMs)).toBe(true);
  });

  it('given time passes past a fuse, when ticked, then that bomb explodes, costs the penalty and a new one is armed elsewhere', () => {
    const s = initBombs(4, 2, makeRng('b'), 1000);
    const { state, exploded, penaltyMs } = tickBombs(s, 5000, makeRng('c'));
    expect(exploded).toHaveLength(2);
    expect(penaltyMs).toBe(2 * BOMB_PENALTY_MS);
    expect(state.bombs).toHaveLength(2);
    expect(state.bombs.every((b) => b.leftMs === 1000)).toBe(true);
  });

  it('given time passes within a fuse, when ticked, then nothing explodes and fuses count down', () => {
    const s = initBombs(4, 2, makeRng('b'), 5000);
    const { state, exploded, penaltyMs } = tickBombs(s, 1000, makeRng('c'));
    expect(exploded).toHaveLength(0);
    expect(penaltyMs).toBe(0);
    expect(state.bombs.map((b) => b.leftMs)).toEqual(s.bombs.map((b) => b.leftMs - 1000));
  });

  it('given a word path through a bomb, when defused, then that bomb is gone, counted, and replaced off the path', () => {
    const s = initBombs(4, 2, makeRng('b'), 5000);
    const hit = s.bombs[0].key.split('-').map(Number) as [number, number];
    const { state, defused } = defuseBombs(s, [hit], makeRng('d'));
    expect(defused).toEqual([s.bombs[0].key]);
    expect(state.defusedCount).toBe(1);
    expect(state.bombs).toHaveLength(2);
    expect(state.bombs.some((b) => b.key === s.bombs[0].key)).toBe(false);
  });
});

describe('levelThreat', () => {
  it('given any world, when threat is read per level, then the boss is max, the elite outranks its neighbours, and it never drops by more than one', () => {
    for (let w = 1; w <= 10; w++) {
      const th = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => levelThreat(getPlayLevel(w, i + 1)));
      expect(th[6]).toBe(5);
      expect(th[3]).toBeGreaterThan(th[2]);
      expect(th.every((x) => x >= 1 && x <= 5)).toBe(true);
    }
  });

  it('given the same slot in a later world, when compared, then threat never goes down', () => {
    expect(levelThreat(getPlayLevel(9, 1))).toBeGreaterThanOrEqual(levelThreat(getPlayLevel(1, 1)));
    expect(levelThreat(getPlayLevel(10, 5))).toBeGreaterThan(levelThreat(getPlayLevel(1, 5)));
  });
});

describe('ruleKeysOf', () => {
  it('given a level that introduces its kind as the world twist, when keyed, then the main rule is the "new" twist sentence', () => {
    expect(ruleKeysOf(getPlayLevel(2, 2))).toEqual({ main: 'adventurePlay.variety.twist.chain', isNew: true });
  });

  it('given a plain level, when keyed, then the main rule is the kind rule and there is no modifier', () => {
    expect(ruleKeysOf(getPlayLevel(1, 1))).toEqual({ main: 'adventurePlay.variety.rule.classic', isNew: false });
  });

  it('given a modifier twist on another kind, when keyed, then the kind rule stays and the twist is a modifier line', () => {
    // w6 L3 is fog+ with the rush twist: the player must still learn how fog works.
    expect(ruleKeysOf(getPlayLevel(6, 3))).toEqual({
      main: 'adventurePlay.variety.rule.fog', modifier: 'adventurePlay.variety.twist.rush', isNew: true,
    });
  });
});

describe('runPathState', () => {
  it('given an active run at step 3, when levels are placed on the path, then earlier are cleared, 3 is current, later are ahead', () => {
    expect([1, 2, 3, 4].map((l) => runPathState(l, 3))).toEqual(['cleared', 'cleared', 'current', 'ahead']);
  });

  it('given no run, when placed, then nothing is marked on the path', () => {
    expect(runPathState(2, null)).toBeNull();
  });
});
