import { describe, it, expect } from 'vitest';
import {
  initCombat, step, enemyScript, GUARD_MS, type CombatState, type EnemyScript, type Attack, type BossRules,
} from '../combat';
import { BOSS_RULE_WORLDS, bossRules } from '../enemyScripts';
import { getPlayLevel } from '../levels';

const only = (attack: Attack, rules?: BossRules, cadenceMs = 5000): EnemyScript => ({
  id: 'test', cadenceMs, phases: [[attack], [attack], [attack]], ...(rules ? { rules } : {}),
});
const HIT: Attack = { id: 'hit', effect: 'hit', damage: 1, telegraphMs: 2000 };

function mk(over: Partial<Parameters<typeof initCombat>[0]> = {}): CombatState {
  return initCombat({ enemyId: 'boss-w1', world: 1, enemyHp: 300, hp: 5, maxHp: 5, relics: [], size: 4, seed: 'seed', ...over });
}
function run(s: CombatState, ms: number): CombatState {
  let st = s;
  for (let t = 0; t < ms; t += 100) st = step(st, { type: 'tick', dt: 100 });
  return st;
}
function untilTelegraph(s: CombatState): CombatState {
  let st = s;
  for (let i = 0; i < 1000 && !st.telegraph; i++) st = step(st, { type: 'tick', dt: 100 });
  return st;
}

describe('combat — shield is a timing action', () => {
  it('given a shield raised with nothing incoming, when the guard window passes, then the next hit still lands', () => {
    let s = mk({ script: only(HIT, undefined, 5000), relics: ['iron-bookmark'] });
    s = step(s, { type: 'tapShield' });
    expect(s.guard).toBe(true);
    s = run(s, GUARD_MS + 200);
    expect(s.guard).toBe(false);
    expect(s.fx).not.toContain('blocked');
    s = run(untilTelegraph(s), 2100);
    expect(s.hp).toBe(4);
  });

  it('given a shield raised early in a long telegraph, when the attack lands, then it is still blocked', () => {
    const SLOW: Attack = { ...HIT, telegraphMs: GUARD_MS * 3 };
    let s = untilTelegraph(mk({ script: only(SLOW), relics: ['iron-bookmark'] }));
    s = step(s, { type: 'tapShield' });
    s = run(s, GUARD_MS * 3 + 100);
    expect(s.hp).toBe(5);
  });

  it('given a raised shield, when a projectile lands inside the window, then it is blocked', () => {
    const SHOT: Attack = { id: 'shot', effect: 'projectile', damage: 1, telegraphMs: 1000 };
    let s = run(untilTelegraph(mk({ script: only(SHOT, undefined, 60_000), relics: ['iron-bookmark'] })), 1100);
    expect(s.projectiles).toHaveLength(1);
    s = run(s, 1000);
    s = step(s, { type: 'tapShield' });
    s = run(s, 1000);
    expect(s.hp).toBe(5);
  });
});

describe('combat — boss rules', () => {
  it('given volley 2, when a projectile attack lands, then two projectiles fly', () => {
    const SHOT: Attack = { id: 'shot', effect: 'projectile', damage: 1, telegraphMs: 1000 };
    const s = run(untilTelegraph(mk({ script: only(SHOT, { volley: 2 }, 60_000) })), 1100);
    expect(s.projectiles).toHaveLength(2);
    expect(new Set(s.projectiles.map((p) => p.id)).size).toBe(2);
  });

  it('given curseBite 2, when a curse expires uncleansed, then it bites for 2', () => {
    const CURSE: Attack = { id: 'curse', effect: 'curse', damage: 1, telegraphMs: 1000, tiles: 2 };
    const s = run(run(untilTelegraph(mk({ script: only(CURSE, { curseBite: 2 }, 60_000) })), 1100), 7000);
    expect(s.hp).toBe(3);
  });

  it('given extraTiles 2, when a freeze lands, then two more tiles freeze', () => {
    const FREEZE: Attack = { id: 'freeze', effect: 'freeze', damage: 0, telegraphMs: 1000, tiles: 2 };
    const s = run(untilTelegraph(mk({ script: only(FREEZE, { extraTiles: 2 }, 60_000) })), 1100);
    expect(s.tiles).toHaveLength(4);
  });

  it('given blindMult 2, when a scramble lands, then the board stays blind twice as long', () => {
    const SCR: Attack = { id: 'shuffle', effect: 'shuffle', damage: 0, telegraphMs: 1000 };
    const a = run(untilTelegraph(mk({ script: only(SCR, undefined, 60_000) })), 1100);
    const b = run(untilTelegraph(mk({ script: only(SCR, { blindMult: 2 }, 60_000) })), 1100);
    expect(b.blindUntil - b.now).toBeGreaterThan((a.blindUntil - a.now) * 1.8);
  });

  it('given shieldLen 6, when a 5-letter word lands, then no shield; a 6-letter word earns one', () => {
    let s = mk({ script: only(HIT, { shieldLen: 6 }) });
    s = step(s, { type: 'word', word: 'plane', points: 1 });
    expect(s.shields).toBe(0);
    s = step(s, { type: 'word', word: 'planet', points: 1 });
    expect(s.shields).toBe(1);
  });

  it('given interruptLen 6, when a 5-letter word lands mid-telegraph, then the attack still comes', () => {
    let s = untilTelegraph(mk({ script: only(HIT, { interruptLen: 6 }) }));
    s = step(s, { type: 'word', word: 'plane', points: 1 });
    expect(s.telegraph).not.toBeNull();
    s = step(s, { type: 'word', word: 'planet', points: 1 });
    expect(s.telegraph).toBeNull();
    expect(s.fx).toContain('interrupt');
  });

  it('given the world boss scripts, when loaded, then worlds 2+ each carry a rule the UI can name', () => {
    expect(BOSS_RULE_WORLDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let w = 2; w <= 10; w++) {
      const rules = bossRules(w);
      expect(Object.keys(rules).length).toBeGreaterThan(0);
      expect(enemyScript(`boss-w${w}`).rules).toEqual(rules);
    }
    expect(enemyScript('elite-w5').rules).toBeUndefined();
  });
});

/** A steady-but-plain player: 4-letter words that kill the enemy at ~90% of the clock. No shield/interrupt/cleanse. */
function simulate(world: number, level: number, relaxed = false): CombatState {
  const lvl = getPlayLevel(world, level);
  let s = initCombat({ enemyId: lvl.enemyId ?? `boss-w${world}`, world, enemyHp: lvl.bossHp, hp: 5, maxHp: 5, relics: [], size: lvl.size, seed: `sim-${world}-${level}` });
  const totalMs = lvl.seconds * 1000;
  const hits = 12;
  const every = Math.floor((totalMs * (relaxed ? 2 : 0.9)) / hits);
  for (let t = 100; t <= totalMs && !s.dead && !s.defeated; t += 100) {
    s = step(s, { type: 'tick', dt: 100 });
    if (t % every < 100) s = step(s, { type: 'word', word: 'word', points: Math.ceil(lvl.bossHp / hits) });
  }
  return s;
}

describe('combat — difficulty curve', () => {
  it('given world 1, when a plain player fights the elite and the boss, then they survive with hearts to spare', () => {
    expect(simulate(1, 4).hp).toBeGreaterThanOrEqual(3);
    expect(simulate(1, 7).hp).toBeGreaterThanOrEqual(2);
    expect(simulate(1, 7).dead).toBe(false);
  });

  it('given late worlds, when the same plain player fights the boss, then they die', () => {
    expect(simulate(8, 7).dead).toBe(true);
    expect(simulate(10, 7).dead).toBe(true);
  });

  it('given rising worlds, when an idle-ish player fights the boss, then damage taken climbs', () => {
    const lost = (w: number) => { const s = simulate(w, 7, true); return s.dead ? 99 : 5 - s.hp; };
    expect(lost(1)).toBeLessThan(lost(4));
    expect(lost(4)).toBeLessThanOrEqual(lost(7));
  });
});
