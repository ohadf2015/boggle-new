import { describe, it, expect } from 'vitest';
import { initCombat, step, type CombatState, type EnemyScript, type Attack } from '../combat';

const only = (attack: Attack, cadenceMs = 1000): EnemyScript => ({ id: 'test', cadenceMs, phases: [[attack], [attack], [attack]] });
const HIT: Attack = { id: 'hit-heavy', effect: 'hit', damage: 2, telegraphMs: 500 };

function mk(over: Partial<Parameters<typeof initCombat>[0]> = {}): CombatState {
  return initCombat({ enemyId: 'elite-w1', world: 1, enemyHp: 50, hp: 5, maxHp: 5, relics: [], size: 4, seed: 's', ...over });
}
function run(s: CombatState, ms: number): CombatState {
  let st = s;
  for (let t = 0; t < ms; t += 100) st = step(st, { type: 'tick', dt: 100 });
  return st;
}

describe('combat — kill record (the finale banner)', () => {
  it('given a live enemy, when a word does not kill, then there is no kill record', () => {
    const s = step(mk(), { type: 'word', word: 'cat', points: 10 });
    expect(s.kill).toBeNull();
  });

  it('given 50 enemy HP, when a 64-point word lands, then the killing word and overkill 14 are recorded', () => {
    const s0 = step(mk(), { type: 'word', word: 'cat', points: 10 });
    const s = step(s0, { type: 'word', word: 'Planets', points: 54 });
    expect(s.defeated).toBe(true);
    expect(s.kill).toEqual({ word: 'Planets', points: 54, overkill: 14 });
  });

  it('given an exact-lethal word, when it lands, then overkill is 0', () => {
    const s = step(mk(), { type: 'word', word: 'exact', points: 50 });
    expect(s.kill?.overkill).toBe(0);
  });

  it('given a kill, when time keeps ticking, then the record survives', () => {
    const s = run(step(mk(), { type: 'word', word: 'boom', points: 99 }), 2000);
    expect(s.kill).toEqual({ word: 'boom', points: 99, overkill: 49 });
  });
});

describe('combat — killedBy (the defeat beat names the blow)', () => {
  it('given a player at 2 HP, when a heavy hit lands, then death names that attack', () => {
    const s = run(mk({ hp: 2, script: only(HIT) }), 3000);
    expect(s.dead).toBe(true);
    expect(s.killedBy).toBe('hit-heavy');
  });

  it('given a living player, then killedBy is null', () => {
    expect(mk().killedBy).toBeNull();
  });
});
