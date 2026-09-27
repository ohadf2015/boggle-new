/**
 * Given an ordinary fight node, When its rival attacks, Then it chips the
 * player's HP with slow, readable hits — but never ends the run on its own.
 */
import { describe, it, expect } from 'vitest';
import { enemyScript, initCombat, step, type CombatState } from '../combat';
import { advanceRun, freshRun, WIN_HEAL } from '../runToken';

const tickFor = (s: CombatState, ms: number) => {
  for (let t = 0; t < ms; t += 100) s = step(s, { type: 'tick', dt: 100 });
  return s;
};

describe('fight-node rival (foe-wN)', () => {
  it('Given any world, When its foe script is read, Then it only throws plain 1-damage hits, non-lethal', () => {
    for (let w = 1; w <= 10; w++) {
      const s = enemyScript(`foe-w${w}`);
      const attacks = s.phases.flat();
      expect(attacks.every((a) => a.effect === 'hit' && a.damage === 1)).toBe(true);
      expect(s.rules?.nonLethal).toBe(true);
    }
  });

  it('Given a world, When foe and elite pacing are compared, Then the foe swings less often', () => {
    for (let w = 1; w <= 10; w++) {
      expect(enemyScript(`foe-w${w}`).cadenceMs).toBeGreaterThan(enemyScript(`elite-w${w}`).cadenceMs);
    }
  });

  it('Given later worlds, When foe pacing is read, Then it never gets slower (difficulty grows)', () => {
    for (let w = 2; w <= 10; w++) {
      expect(enemyScript(`foe-w${w}`).cadenceMs).toBeLessThanOrEqual(enemyScript(`foe-w${w - 1}`).cadenceMs);
    }
  });

  it('Given an undefended 90s fight, When the foe attacks, Then HP drops but the player survives on 1', () => {
    let s = initCombat({ enemyId: 'foe-w10', world: 10, enemyHp: 999, hp: 3, maxHp: 5, relics: [], size: 4, seed: 'x' });
    s = tickFor(s, 90_000);
    expect(s.hp).toBe(1);
    expect(s.dead).toBe(false);
  });

  it('Given an undefended 90s world-1 fight, When the foe attacks, Then it lands at least one hit', () => {
    let s = initCombat({ enemyId: 'foe-w1', world: 1, enemyHp: 999, hp: 5, maxHp: 5, relics: [], size: 4, seed: 'x' });
    s = tickFor(s, 90_000);
    expect(s.hp).toBeLessThan(5);
    expect(s.hp).toBeGreaterThanOrEqual(3);
  });
});

describe('win heal', () => {
  it('Given a won node, When the run advances, Then the player heals a little (capped at max)', () => {
    const run = freshRun(1, 'u', 'seed');
    const hurt = advanceRun(run, { hpLeft: 2, potionsUsed: {}, score: 0 });
    expect(hurt.hp).toBe(Math.min(run.maxHp, 2 + WIN_HEAL));
    const full = advanceRun(run, { hpLeft: run.maxHp, potionsUsed: {}, score: 0 });
    expect(full.hp).toBe(run.maxHp);
  });
});
