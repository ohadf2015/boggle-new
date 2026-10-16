import { describe, it, expect } from 'vitest';
import {
  createBoss,
  applyWord,
  tick,
  endBossRound,
  frozenTiles,
  bossMaxHp,
  comboMultiplier,
  toView,
  shiftBoss,
  type BossState,
} from '../engine';
import { BOSS_RULES as R } from '../rules';

const T0 = 1_000_000;

function fighting(over: Partial<BossState> = {}): BossState {
  const boss = createBoss({ seed: 'ABCD:1', bossId: 'lexiconDragon', students: 4, roundSeconds: 120, rows: 4, cols: 4, now: T0 });
  const started = tick(boss, T0 + R.introMs).state;
  return { ...started, ...over };
}

describe('createBoss', () => {
  it('given more students or a longer round, when armed, then the boss has more HP', () => {
    expect(bossMaxHp(8, 120)).toBeGreaterThan(bossMaxHp(4, 120));
    expect(bossMaxHp(4, 180)).toBeGreaterThan(bossMaxHp(4, 120));
    expect(bossMaxHp(0, 10)).toBe(R.minHp);
  });

  it('given a fresh boss, then it starts full, in phase 1, in its intro, with no shield', () => {
    const b = createBoss({ seed: 'X:1', bossId: 'msGrammar', students: 3, roundSeconds: 90, rows: 4, cols: 4, now: T0 });
    expect(b.hp).toBe(b.maxHp);
    expect(b.phase).toBe(1);
    expect(b.status).toBe('intro');
    expect(b.shield).toBe(0);
    expect(b.damageBy).toEqual({});
  });

  it('given the intro elapsed, when ticked, then the fight starts', () => {
    const b = createBoss({ seed: 'X:1', bossId: 'msGrammar', students: 3, roundSeconds: 90, rows: 4, cols: 4, now: T0 });
    expect(tick(b, T0 + R.introMs - 1).state.status).toBe('intro');
    expect(tick(b, T0 + R.introMs).state.status).toBe('fighting');
  });
});

describe('applyWord damage', () => {
  it('given a short word, then damage equals its accepted score and is credited to the player', () => {
    const r = applyWord(fighting(), { username: 'ana', word: 'cat', score: 2, now: T0 + 5000 });
    expect(r.hit).toEqual({ username: 'ana', word: 'cat', dmg: 2, crit: false, multiplier: 1 });
    expect(r.state.hp).toBe(r.state.maxHp - 2);
    expect(r.state.damageBy.ana).toBe(2);
    expect(r.state.lastHits[0]).toEqual({ id: 1, username: 'ana', word: 'cat', dmg: 2, crit: false });
  });

  it('given a 7+ letter word, then it crits for double', () => {
    const r = applyWord(fighting(), { username: 'ana', word: 'planets', score: 6, now: T0 + 5000 });
    expect(r.hit?.crit).toBe(true);
    expect(r.hit?.dmg).toBe(12);
  });

  it('given one huge word, then a single hit is capped so no word one-shots the boss', () => {
    const s = fighting();
    const r = applyWord(s, { username: 'ana', word: 'telomeres', score: 500, now: T0 + 5000 });
    expect(r.hit?.dmg).toBe(Math.ceil(s.maxHp * R.maxHitPct));
    expect(r.state.hp).toBeGreaterThan(0);
  });

  it('given the fight already ended, then a word does nothing', () => {
    const over = fighting({ status: 'defeated', hp: 0 });
    expect(applyWord(over, { username: 'a', word: 'cat', score: 2, now: T0 + 5000 }).hit).toBeNull();
  });

  it('given a zero score, then no hit lands', () => {
    expect(applyWord(fighting(), { username: 'a', word: 'cat', score: 0, now: T0 + 5000 }).hit).toBeNull();
  });
});

describe('class combo', () => {
  it('maps the class streak to x1..x4', () => {
    expect([1, 2, 3, 5, 6, 9, 10, 40].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('given words from different students inside the window, then the combo builds and multiplies damage', () => {
    let s = fighting();
    const now = T0 + 5000;
    for (let i = 0; i < 3; i++) s = applyWord(s, { username: `p${i}`, word: 'cat', score: 2, now: now + i * 1000 }).state;
    expect(s.combo.count).toBe(3);
    const r = applyWord(s, { username: 'p9', word: 'dog', score: 2, now: now + 3500 });
    expect(r.hit?.multiplier).toBe(2);
    expect(r.hit?.dmg).toBe(4);
  });

  it('given a gap longer than the window, then the combo resets', () => {
    let s = applyWord(fighting(), { username: 'a', word: 'cat', score: 2, now: T0 + 5000 }).state;
    s = applyWord(s, { username: 'b', word: 'cat', score: 2, now: T0 + 5000 + R.comboWindowMs + 1 }).state;
    expect(s.combo.count).toBe(1);
  });

  it('given silence past the window, when ticked, then the combo drops to zero', () => {
    const s = applyWord(fighting(), { username: 'a', word: 'cat', score: 2, now: T0 + 5000 }).state;
    expect(tick(s, T0 + 5000 + R.comboWindowMs + 1).state.combo.count).toBe(0);
  });
});

describe('shield', () => {
  it('given 5+ letter words, then the class shield charges up to its max', () => {
    let s = fighting();
    for (let i = 0; i < 8; i++) s = applyWord(s, { username: 'a', word: 'stone', score: 4, now: T0 + 5000 + i * 5000 }).state;
    expect(s.shield).toBe(R.shieldMax);
  });

  it('given a 4-letter word, then the shield does not charge', () => {
    expect(applyWord(fighting(), { username: 'a', word: 'tone', score: 3, now: T0 + 5000 }).state.shield).toBe(0);
  });
});

describe('phases', () => {
  it('given HP drops below 66%, then phase 2 starts with a pause and the open telegraph is cancelled', () => {
    const full = fighting();
    const base = fighting({ hp: Math.ceil(full.maxHp * 0.67) });
    const s = { ...base, telegraph: { kind: 'freeze' as const, startsAt: T0, landsAt: T0 + 99_999, longWords: 0 } };
    const r = applyWord(s, { username: 'a', word: 'cat', score: Math.ceil(full.maxHp * 0.05), now: T0 + 6000 });
    expect(r.state.phase).toBe(2);
    expect(r.state.status).toBe('phase-change');
    expect(r.state.telegraph).toBeNull();
    expect(r.events).toContain('phase');
    expect(tick(r.state, T0 + 6000 + R.phasePauseMs).state.status).toBe('fighting');
  });

  it('given HP drops below 33%, then phase 3 (enraged) attacks come faster', () => {
    const full = fighting();
    const base = fighting({ hp: Math.ceil(full.maxHp * 0.34), phase: 2 });
    const r = applyWord(base, { username: 'a', word: 'cat', score: Math.ceil(full.maxHp * 0.05), now: T0 + 6000 });
    expect(r.state.phase).toBe(3);
    expect(R.cadenceMs[2]).toBeLessThan(R.cadenceMs[0]);
    expect(R.telegraphMs[2]).toBeLessThan(R.telegraphMs[0]);
  });
});

describe('telegraphed attacks', () => {
  function telegraphed(over: Partial<BossState> = {}) {
    const s = fighting(over);
    const r = tick(s, s.nextTelegraphAt);
    expect(r.events).toContain('telegraph');
    expect(r.state.telegraph).not.toBeNull();
    return r.state;
  }

  it('given the attack clock ran out, then a telegraph opens with a countdown', () => {
    const s = telegraphed();
    expect(s.telegraph!.landsAt - s.telegraph!.startsAt).toBe(R.telegraphMs[0]);
  });

  it('given a shield charge, when the attack lands, then it is blocked and costs one charge', () => {
    const s = telegraphed({ shield: 2 });
    const r = tick({ ...s, telegraph: { ...s.telegraph!, kind: 'freeze' } }, s.telegraph!.landsAt);
    expect(r.attack).toEqual({ kind: 'freeze', blocked: true, healed: 0, tiles: [] });
    expect(r.state.shield).toBe(1);
    expect(r.state.effect).toBeNull();
  });

  it('given no shield, when a freeze lands, then the boss heals 5% and freezes 3 distinct tiles for 5s', () => {
    const hurt = fighting();
    const half = Math.floor(hurt.maxHp / 2);
    const s = telegraphed({ hp: half });
    const at = s.telegraph!.landsAt;
    const r = tick({ ...s, telegraph: { ...s.telegraph!, kind: 'freeze' } }, at);
    const heal = Math.ceil(s.maxHp * R.healPct);
    expect(r.attack?.blocked).toBe(false);
    expect(r.attack?.healed).toBe(heal);
    expect(r.state.hp).toBe(half + heal);
    const tiles = frozenTiles(r.state, at + 1);
    expect(tiles).toHaveLength(R.freezeTiles);
    expect(new Set(tiles.map((t) => `${t.row},${t.col}`)).size).toBe(R.freezeTiles);
    expect(frozenTiles(r.state, at + R.freezeMs)).toEqual([]);
  });

  it('given heal at full HP, then HP never exceeds max', () => {
    const s = telegraphed();
    const r = tick({ ...s, telegraph: { ...s.telegraph!, kind: 'blur' } }, s.telegraph!.landsAt);
    expect(r.state.hp).toBe(s.maxHp);
    expect(r.state.effect?.kind).toBe('blur');
  });

  it('given a drain lands on a shield, then it takes up to two charges', () => {
    const s = telegraphed({ shield: 3 });
    const r = tick({ ...s, telegraph: { ...s.telegraph!, kind: 'drain' } }, s.telegraph!.landsAt);
    expect(r.attack?.blocked).toBe(true);
    expect(r.state.shield).toBe(1);
  });

  it('given 3 long words during a telegraph, then the boss is staggered and the attack never lands', () => {
    let s = telegraphed();
    const t = s.telegraph!.startsAt + 100;
    const events: string[] = [];
    for (let i = 0; i < R.staggerWords; i++) {
      const r = applyWord(s, { username: `p${i}`, word: 'planet', score: 5, now: t + i });
      s = r.state;
      events.push(...r.events);
    }
    expect(events).toContain('staggered');
    expect(toView(s, t).staggers).toBe(1);
    expect(s.telegraph).toBeNull();
    expect(s.nextTelegraphAt).toBeGreaterThan(t);
  });

  it('given 2 long words only, then the attack still lands', () => {
    let s = telegraphed();
    for (let i = 0; i < 2; i++) s = applyWord(s, { username: 'a', word: 'planet', score: 5, now: s.telegraph!.startsAt + i }).state;
    expect(tick(s, s.telegraph!.landsAt).attack).not.toBeNull();
  });
});

describe('win / lose', () => {
  it('given HP reaches 0, then the boss is defeated and the event says so', () => {
    const s = fighting({ hp: 10, phase: 3 });
    const r = applyWord(s, { username: 'a', word: 'cat', score: 50, now: T0 + 5000 });
    expect(r.state.hp).toBe(0);
    expect(r.state.status).toBe('defeated');
    expect(r.events).toContain('defeated');
    expect(toView(r.state, T0 + 5000).pctDealt).toBe(100);
  });

  it('given the timer runs out with HP left, then the boss escapes with % dealt', () => {
    const s = fighting();
    const dealt = Math.floor(s.maxHp * R.maxHitPct);
    const hit = applyWord(s, { username: 'a', word: 'cat', score: dealt, now: T0 + 5000 }).state;
    const end = endBossRound(hit);
    expect(end.status).toBe('escaped');
    expect(toView(end, T0 + 9000).pctDealt).toBe(Math.round((dealt / s.maxHp) * 100));
  });

  it('given a defeated boss, when the round ends, then it stays defeated', () => {
    expect(endBossRound(fighting({ hp: 0, status: 'defeated' })).status).toBe('defeated');
  });
});

describe('determinism', () => {
  it('given the same seed, then attacks and frozen tiles replay identically', () => {
    const run = () => {
      let s = fighting({ hp: 100 });
      const out: string[] = [];
      for (let t = T0; t < T0 + 200_000; t += 500) {
        const r = tick(s, t);
        s = r.state;
        if (r.attack) out.push(`${r.attack.kind}:${r.attack.tiles.map((x) => `${x.row}${x.col}`).join('')}`);
      }
      return out;
    };
    expect(run()).toEqual(run());
    expect(run().length).toBeGreaterThan(3);
  });
});

describe('toView', () => {
  it('lists top hitters by damage and keeps the last hits newest first', () => {
    let s = fighting();
    s = applyWord(s, { username: 'a', word: 'cat', score: 2, now: T0 + 5000 }).state;
    s = applyWord(s, { username: 'b', word: 'planets', score: 6, now: T0 + 9000 }).state;
    const v = toView(s, T0 + 9000);
    expect(v.topHitters[0]).toEqual({ username: 'b', dmg: 12 });
    expect(v.lastHits[0].word).toBe('planets');
    expect(v.lastHits[0].id).toBeGreaterThan(v.lastHits[1].id);
    expect(v.shieldMax).toBe(R.shieldMax);
  });
});

describe('shiftBoss (pause / clock start)', () => {
  it('given a 30s teacher pause, when shifted, then the open telegraph still has its full countdown left', () => {
    const s = fighting();
    const open = tick(s, s.nextTelegraphAt).state;
    const left = open.telegraph!.landsAt - open.nextTelegraphAt;
    const shifted = shiftBoss(open, 30_000);
    expect(tick(shifted, open.telegraph!.landsAt).attack).toBeNull();
    expect(shifted.telegraph!.landsAt).toBe(open.telegraph!.landsAt + 30_000);
    expect(left).toBeGreaterThan(0);
  });

  it('given the countdown delayed the round clock, when shifted, then the intro starts from the real start', () => {
    const b = createBoss({ seed: 'X:1', bossId: 'msGrammar', students: 3, roundSeconds: 90, rows: 4, cols: 4, now: T0 });
    const s = shiftBoss(b, 8000);
    expect(tick(s, T0 + R.introMs).state.status).toBe('intro');
    expect(tick(s, T0 + 8000 + R.introMs).state.status).toBe('fighting');
  });

  it('given a frozen-tile effect, when shifted, then it expires later by the same amount', () => {
    const s = fighting({ effect: { kind: 'freeze', tiles: [{ row: 0, col: 0 }], until: T0 + 10_000 } });
    expect(frozenTiles(shiftBoss(s, 5000), T0 + 12_000)).toHaveLength(1);
  });
});

describe('exposed window (stagger reward)', () => {
  function staggered(): { s: BossState; t: number } {
    const base = fighting();
    let s = tick(base, base.nextTelegraphAt).state;
    const t = s.telegraph!.startsAt + 100;
    for (let i = 0; i < R.staggerWords; i++) s = applyWord(s, { username: `p${i}`, word: 'planet', score: 5, now: t + i }).state;
    return { s, t: t + R.staggerWords - 1 };
  }

  it('given a fresh boss, then it is not exposed', () => {
    expect(toView(fighting(), T0 + R.introMs).exposed).toBeNull();
  });

  it('given the class staggers the boss, then it is exposed for the window', () => {
    const { s, t } = staggered();
    expect(toView(s, t).exposed).toEqual({ msLeft: R.exposedMs, totalMs: R.exposedMs });
    expect(toView(s, t + R.exposedMs).exposed).toBeNull();
  });

  it('given the boss is exposed, when a word lands, then it deals the exposed multiplier and the hit says so', () => {
    const { s, t } = staggered();
    const normal = applyWord({ ...s, exposedUntil: 0, combo: { count: 0, lastAt: -Infinity } }, { username: 'z', word: 'cat', score: 10, now: t + 1 });
    const boosted = applyWord({ ...s, combo: { count: 0, lastAt: -Infinity } }, { username: 'z', word: 'cat', score: 10, now: t + 1 });
    expect(boosted.hit!.dmg).toBe(Math.round(normal.hit!.dmg * R.exposedMult));
    expect(boosted.state.lastHits[0].exposed).toBe(true);
    expect(normal.state.lastHits[0].exposed).toBeFalsy();
  });

  it('given a teacher pause while exposed, when shifted, then the window keeps its time left', () => {
    const { s, t } = staggered();
    const shifted = shiftBoss(s, 30_000);
    expect(toView(shifted, t + 30_000).exposed?.msLeft).toBe(R.exposedMs);
  });
});
