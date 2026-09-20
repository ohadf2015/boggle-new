import { describe, it, expect } from 'vitest';
import {
  initCombat, step, enemyScript, MAX_SHIELDS, PROJECTILE_MS, type CombatState, type EnemyScript, type Attack,
} from '../combat';

const only = (attack: Attack, cadenceMs = 5000): EnemyScript => ({
  id: 'test', cadenceMs, phases: [[attack], [attack], [attack]],
});
const HIT: Attack = { id: 'hit', effect: 'hit', damage: 1, telegraphMs: 2000 };

function mk(over: Partial<Parameters<typeof initCombat>[0]> = {}): CombatState {
  return initCombat({ enemyId: 'boss-w1', world: 1, enemyHp: 300, hp: 5, maxHp: 5, relics: [], size: 4, seed: 'seed', ...over });
}
/** Tick in 100ms slices so timers resolve like the 200ms UI interval would. */
function run(s: CombatState, ms: number): CombatState {
  let st = s;
  for (let t = 0; t < ms; t += 100) st = step(st, { type: 'tick', dt: 100 });
  return st;
}
/** Advance until a telegraph is up. */
function untilTelegraph(s: CombatState): CombatState {
  let st = s;
  for (let i = 0; i < 1000 && !st.telegraph; i++) st = step(st, { type: 'tick', dt: 100 });
  return st;
}

describe('combat — init', () => {
  it('given relics, when a fight starts, then shields/hp/enemy hp are set and nothing is telegraphed', () => {
    const s = mk({ relics: ['iron-bookmark'] });
    expect(s).toMatchObject({ hp: 5, maxHp: 5, shields: 1, enemyHp: 300, enemyMaxHp: 300, phase: 0, telegraph: null, dead: false, defeated: false });
  });
});

describe('combat — telegraph + hit', () => {
  it('given time passes, when the cadence elapses, then an attack is telegraphed and then lands', () => {
    const s0 = mk({ script: only(HIT) });
    const s1 = untilTelegraph(s0);
    expect(s1.telegraph?.attack.id).toBe('hit');
    expect(s1.fx).toContain('telegraph');
    const s2 = run(s1, 2100);
    expect(s2.hp).toBe(4);
    expect(s2.telegraph).toBeNull();
  });

  it('given a shield charge, when tapped during the telegraph, then the hit is blocked', () => {
    let s = untilTelegraph(mk({ script: only(HIT), relics: ['iron-bookmark'] }));
    s = step(s, { type: 'tapShield' });
    expect(s.shields).toBe(0);
    expect(s.guard).toBe(true);
    s = run(s, 2100);
    expect(s.hp).toBe(5);
    expect(s.guard).toBe(false);
  });

  it('given no shield charges, when shield is tapped, then nothing happens', () => {
    const s = step(mk(), { type: 'tapShield' });
    expect(s.guard).toBe(false);
  });
});

describe('combat — words', () => {
  it('given a word, when it lands, then the enemy loses its points in HP', () => {
    const s = step(mk(), { type: 'word', word: 'cat', points: 40 });
    expect(s.enemyHp).toBe(260);
    expect(s.fx).toContain('damage');
  });

  it('given a 5+ letter word during a telegraph, when it lands, then it interrupts and grants a shield', () => {
    let s = untilTelegraph(mk({ script: only(HIT) }));
    s = step(s, { type: 'word', word: 'plane', points: 10 });
    expect(s.telegraph).toBeNull();
    expect(s.fx).toContain('interrupt');
    expect(s.shields).toBe(1);
    s = run(s, 2100);
    expect(s.hp).toBe(5);
  });

  it('given many long words, when they land, then shields cap at MAX_SHIELDS', () => {
    let s = mk();
    for (let i = 0; i < 6; i++) s = step(s, { type: 'word', word: 'planes', points: 1 });
    expect(s.shields).toBe(MAX_SHIELDS);
  });

  it('given vampire-fang, when a 6+ letter word lands while hurt, then it heals 1', () => {
    let s = run(untilTelegraph(mk({ script: only(HIT), relics: ['vampire-fang'] })), 2100);
    expect(s.hp).toBe(4);
    s = step(s, { type: 'word', word: 'planet', points: 1 });
    expect(s.hp).toBe(5);
  });

  it('given the enemy drops under 66% then 33%, when hit, then phases advance and the attack set changes', () => {
    let s = mk();
    s = step(s, { type: 'word', word: 'cat', points: 110 });
    expect(s.phase).toBe(1);
    expect(s.fx).toContain('phase');
    s = step(s, { type: 'word', word: 'dog', points: 100 });
    expect(s.phase).toBe(2);
    const script = enemyScript('boss-w1');
    expect(script.phases[2]).not.toEqual(script.phases[0]);
  });

  it('given lethal damage, when it lands, then the enemy is defeated and time no longer matters', () => {
    let s = step(mk(), { type: 'word', word: 'cat', points: 999 });
    expect(s.defeated).toBe(true);
    const after = run(s, 20_000);
    expect(after.hp).toBe(5);
  });
});

describe('combat — tile effects', () => {
  const FREEZE: Attack = { id: 'freeze', effect: 'freeze', damage: 0, telegraphMs: 1000, tiles: 2 };

  it('given a freeze attack, when it lands, then tiles freeze, can be tapped clean, and thaw on their own', () => {
    let s = run(untilTelegraph(mk({ script: only(FREEZE, 60_000) })), 1100);
    expect(s.tiles).toHaveLength(2);
    expect(s.tiles.every((t) => t.kind === 'freeze')).toBe(true);
    const key = s.tiles[0].key;
    s = step(s, { type: 'tapTile', key });
    expect(s.tiles.map((t) => t.key)).not.toContain(key);
    s = run(s, 4100);
    expect(s.tiles).toHaveLength(0);
  });

  it('given frost-ward, when frozen, then the freeze lasts half as long', () => {
    const plain = run(untilTelegraph(mk({ script: only(FREEZE, 60_000) })), 1100);
    const warded = run(untilTelegraph(mk({ script: only(FREEZE, 60_000), relics: ['frost-ward'] })), 1100);
    expect(warded.tiles[0].until - warded.now).toBeLessThan(plain.tiles[0].until - plain.now);
  });

  it('given a curse left uncleansed, when it expires, then the player takes 1 damage', () => {
    const CURSE: Attack = { id: 'curse', effect: 'curse', damage: 1, telegraphMs: 1000, tiles: 2 };
    let s = run(untilTelegraph(mk({ script: only(CURSE, 60_000) })), 1100);
    expect(s.tiles.every((t) => t.kind === 'curse')).toBe(true);
    s = run(s, 7000);
    expect(s.tiles).toHaveLength(0);
    expect(s.hp).toBe(4);
  });

  it('given a cleanse potion, when used, then tiles clear and the enemy is stunned', () => {
    let s = run(untilTelegraph(mk({ script: only(FREEZE, 60_000) })), 1100);
    s = step(s, { type: 'potion', id: 'cleanse' });
    expect(s.tiles).toHaveLength(0);
    expect(s.stunnedUntil).toBeGreaterThan(s.now);
  });
});

describe('combat — projectiles', () => {
  const SHOT: Attack = { id: 'shot', effect: 'projectile', damage: 1, telegraphMs: 1000 };

  it('given a projectile, when swiped, then it never lands', () => {
    let s = run(untilTelegraph(mk({ script: only(SHOT, 60_000) })), 1100);
    expect(s.projectiles).toHaveLength(1);
    s = step(s, { type: 'swipeProjectile', id: s.projectiles[0].id });
    s = run(s, PROJECTILE_MS + 200);
    expect(s.hp).toBe(5);
  });

  it('given a projectile ignored, when it lands, then it deals damage', () => {
    const s = run(run(untilTelegraph(mk({ script: only(SHOT, 60_000) })), 1100), PROJECTILE_MS + 200);
    expect(s.hp).toBe(4);
  });
});

describe('combat — death', () => {
  const BIG: Attack = { id: 'smash', effect: 'hit', damage: 5, telegraphMs: 500 };

  it('given lethal damage, when it lands, then the player dies', () => {
    let s = untilTelegraph(mk({ script: only(BIG) }));
    for (let i = 0; i < 10 && !s.dead; i++) s = step(s, { type: 'tick', dt: 100 });
    expect(s.dead).toBe(true);
    expect(s.fx).toContain('death');
  });

  it('given phoenix-feather, when lethal damage lands, then the player revives once at 1 HP', () => {
    let s = run(untilTelegraph(mk({ script: only(BIG, 3000), relics: ['phoenix-feather'] })), 600);
    expect(s.dead).toBe(false);
    expect(s.hp).toBe(1);
    expect(s.revived).toBe(true);
    s = run(untilTelegraph(s), 600);
    expect(s.dead).toBe(true);
  });

  it('given a heal potion, when used, then hp rises up to max', () => {
    let s = run(untilTelegraph(mk({ script: only(HIT) })), 2100);
    s = step(s, { type: 'potion', id: 'heal' });
    expect(s.hp).toBe(5);
  });
});

describe('combat — determinism + scripts', () => {
  it('given the same seed and events, when replayed, then the state is identical', () => {
    const a = run(mk({ enemyId: 'boss-w10', world: 10, size: 5 }), 60_000);
    const b = run(mk({ enemyId: 'boss-w10', world: 10, size: 5 }), 60_000);
    expect(a).toEqual(b);
  });

  it('given every world, when scripts load, then bosses have 3 phases, elites exist, and later worlds hit faster', () => {
    for (let w = 1; w <= 10; w++) {
      const boss = enemyScript(`boss-w${w}`);
      const elite = enemyScript(`elite-w${w}`);
      expect(boss.phases).toHaveLength(3);
      expect(boss.phases.every((p) => p.length > 0)).toBe(true);
      expect(elite.phases[0].length).toBeGreaterThan(0);
    }
    expect(enemyScript('boss-w10').cadenceMs).toBeLessThan(enemyScript('boss-w1').cadenceMs);
    expect(enemyScript('elite-w3').cadenceMs).toBeGreaterThan(enemyScript('boss-w3').cadenceMs);
  });
});
