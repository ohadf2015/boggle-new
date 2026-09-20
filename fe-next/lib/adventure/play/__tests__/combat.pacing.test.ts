import { describe, expect, it } from 'vitest';
import { enemyScript, initCombat, step, type Attack, type CombatState, type EnemyScript } from '../combat';

const base = { world: 1, enemyHp: 200, hp: 5, maxHp: 5, relics: [], size: 4, seed: 's' } as const;

/** Tick in 100ms steps, counting telegraphs started. */
function run(s: CombatState, ms: number): { s: CombatState; telegraphs: number; firstAt: number | null } {
  let telegraphs = 0;
  let firstAt: number | null = null;
  for (let t = 0; t < ms; t += 100) {
    s = step(s, { type: 'tick', dt: 100 });
    if (s.fx.includes('telegraph')) {
      telegraphs += 1;
      if (firstAt == null) firstAt = s.now;
    }
  }
  return { s, telegraphs, firstAt };
}

describe('combat pacing — the fight actually happens', () => {
  it('given a script with openingMs, when the fight starts, then the first telegraph comes at openingMs, not after a full cadence', () => {
    const hit: Attack = { id: 'hit', effect: 'hit', damage: 1, telegraphMs: 1000 };
    const script: EnemyScript = { id: 'test', cadenceMs: 20000, openingMs: 3000, phases: [[hit], [hit], [hit]] };
    const { firstAt } = run(initCombat({ ...base, enemyId: 'boss-w1', script }), 6000);
    expect(firstAt).toBe(3000);
  });

  it('given a script without openingMs, when the fight starts, then the first telegraph waits one cadence (back-compat)', () => {
    const hit: Attack = { id: 'hit', effect: 'hit', damage: 1, telegraphMs: 1000 };
    const script: EnemyScript = { id: 'test', cadenceMs: 5000, phases: [[hit], [hit], [hit]] };
    const { firstAt } = run(initCombat({ ...base, enemyId: 'boss-w1', script }), 8000);
    expect(firstAt).toBe(5000);
  });

  it('given every world, when a 25s fight runs, then the boss winds up at least twice and the elite at least once', () => {
    for (let w = 1; w <= 10; w++) {
      // Deep HP so the count measures pacing, not how fast the player dies.
      const boss = run(initCombat({ ...base, world: w, enemyId: `boss-w${w}`, hp: 99, maxHp: 99 }), 25000);
      const elite = run(initCombat({ ...base, world: w, enemyId: `elite-w${w}`, hp: 99, maxHp: 99 }), 25000);
      expect(boss.telegraphs, `boss-w${w}`).toBeGreaterThanOrEqual(2);
      expect(elite.telegraphs, `elite-w${w}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('given world 1, when the boss opens, then it winds up within 6s (teach the loop early) but no faster than world 10', () => {
    const w1 = enemyScript('boss-w1');
    const w10 = enemyScript('boss-w10');
    expect(w1.openingMs).toBeLessThanOrEqual(6000);
    expect(w10.openingMs).toBeLessThan(w1.openingMs ?? Infinity);
    // Elites give a beat longer to read the stage.
    expect(enemyScript('elite-w1').openingMs).toBeGreaterThan(w1.openingMs ?? 0);
  });

  it('given world 1 vs world 10, when a 40s fight runs, then world 10 lands clearly more attacks (later worlds are nasty)', () => {
    const w1 = run(initCombat({ ...base, world: 1, enemyId: 'boss-w1', hp: 99, maxHp: 99 }), 40000);
    const w10 = run(initCombat({ ...base, world: 10, enemyId: 'boss-w10', hp: 99, maxHp: 99 }), 40000);
    expect(w10.telegraphs).toBeGreaterThanOrEqual(w1.telegraphs + 2);
  });
});
