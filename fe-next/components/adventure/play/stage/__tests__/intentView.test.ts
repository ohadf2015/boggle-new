import { describe, it, expect } from 'vitest';
import type { Attack, BossRules, CombatState } from '@/lib/adventure/play/combat';
import { incomingThreat, phaseThreats, standingThreat, threatOf, willBlock } from '../intentView';

const atk = (over: Partial<Attack> = {}): Attack => ({ id: 'hit', effect: 'hit', damage: 1, telegraphMs: 2000, ...over });

const state = (over: Partial<CombatState> = {}): CombatState => ({
  script: { id: 's', cadenceMs: 5000, phases: [[atk()], [], []] },
  now: 0, rng: 1, size: 4, hp: 5, maxHp: 5, shields: 0, guard: false, guardUntil: 0,
  enemyHp: 10, enemyMaxHp: 10, phase: 0, telegraph: null, nextAttackAt: 1000, stunnedUntil: 0,
  tiles: [], projectiles: [], nextProjectileId: 1, blindUntil: 0, effectMult: 1,
  vampire: false, canRevive: false, revived: false, dead: false, defeated: false,
  kill: null, killedBy: null, fx: [],
  ...over,
} as CombatState);

describe('threatOf', () => {
  it('reads a plain strike as its damage, one shot, no tiles', () => {
    expect(threatOf(atk({ damage: 2 }), undefined)).toEqual({
      id: 'hit', effect: 'hit', damage: 2, tiles: 0, volley: 1, heavy: false,
    });
  });

  it('multiplies a projectile by the boss volley rule', () => {
    // combat.ts pushes `volley` projectiles, each for `attack.damage`.
    const t = threatOf(atk({ id: 'projectile', effect: 'projectile', damage: 2 }), { volley: 3 });
    expect(t.damage).toBe(6);
    expect(t.volley).toBe(3);
  });

  it('counts a freeze in tiles, not hearts, and adds the boss extra tile', () => {
    const t = threatOf(atk({ id: 'freeze', effect: 'freeze', damage: 0, tiles: 2 }), { extraTiles: 1 });
    expect(t).toMatchObject({ damage: 0, tiles: 3 });
  });

  it('prices a curse at the boss curse bite, never the attack damage', () => {
    // combat.ts: an uncleansed curse bites for `rules.curseBite ?? 1`.
    expect(threatOf(atk({ id: 'curse', effect: 'curse', damage: 1, tiles: 2 }), { curseBite: 2 }).damage).toBe(2);
    expect(threatOf(atk({ id: 'curse', effect: 'curse', damage: 1, tiles: 2 }), undefined).damage).toBe(1);
  });

  it('gives a scramble no number at all', () => {
    const t = threatOf(atk({ id: 'shuffle', effect: 'shuffle', damage: 0 }), undefined);
    expect(t.damage).toBe(0);
    expect(t.tiles).toBe(0);
  });

  it('flags a heavy attack by its id suffix', () => {
    expect(threatOf(atk({ id: 'hit-heavy' }), undefined).heavy).toBe(true);
  });
});

describe('phaseThreats', () => {
  it('lists the current phase moves once each, in order', () => {
    const a = atk({ id: 'hit' });
    const b = atk({ id: 'freeze', effect: 'freeze', damage: 0, tiles: 2 });
    const s = state({ phase: 1, script: { id: 's', cadenceMs: 5000, phases: [[], [a, b, a], []] } as CombatState['script'] });
    expect(phaseThreats(s).map((t) => t.id)).toEqual(['hit', 'freeze']);
  });
});

describe('incomingThreat', () => {
  it('is null when nothing is winding up', () => {
    expect(incomingThreat(state())).toBeNull();
  });

  it('prices the telegraphed attack with the script rules', () => {
    const a = atk({ id: 'projectile', effect: 'projectile', damage: 1 });
    const s = state({
      telegraph: { attack: a, startedAt: 0, endsAt: 2000 },
      script: { id: 's', cadenceMs: 5000, rules: { volley: 2 }, phases: [[a], [], []] } as CombatState['script'],
    });
    expect(incomingThreat(s)?.damage).toBe(2);
  });
});

describe('willBlock', () => {
  it('is true only when a raised shield meets a threat that costs hearts', () => {
    const hit = threatOf(atk({ damage: 1 }), undefined);
    const frost = threatOf(atk({ id: 'freeze', effect: 'freeze', damage: 0, tiles: 2 }), undefined);
    expect(willBlock(state({ guard: true }), hit)).toBe(true);
    expect(willBlock(state({ guard: false }), hit)).toBe(false);
    expect(willBlock(state({ guard: true }), frost)).toBe(false);
    expect(willBlock(state({ guard: true }), null)).toBe(false);
  });
});

describe('standingThreat', () => {
  const hit = atk({ id: 'hit', damage: 1 });
  const heavy = atk({ id: 'hit-heavy', damage: 3 });
  const shuffle = atk({ id: 'shuffle', effect: 'shuffle', damage: 0 });

  const withPhase = (moves: Attack[]) => state({
    phase: 0,
    script: { id: 's', cadenceMs: 5000, phases: [moves, [], []] } as CombatState['script'],
  });

  it('is exact when every move that costs hearts costs the same', () => {
    const s = standingThreat(withPhase([hit, shuffle, atk({ id: 'drain', effect: 'drain', damage: 1 })]));
    expect(s).toMatchObject({ exact: true });
    expect(s?.threat.damage).toBe(1);
  });

  it('falls back to the worst case when the phase mixes damage', () => {
    const s = standingThreat(withPhase([hit, heavy]));
    expect(s).toMatchObject({ exact: false });
    expect(s?.threat.damage).toBe(3);
  });

  it('is null for a phase that only touches the board', () => {
    expect(standingThreat(withPhase([shuffle]))).toBeNull();
  });
});
