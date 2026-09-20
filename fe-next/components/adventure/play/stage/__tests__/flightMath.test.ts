import { describe, it, expect } from 'vitest';
import { flightTarget, releaseDelay, missileArt, consequence, arcPoints, TRAVEL_MS } from '../flightMath';
import { initCombat, type CombatState } from '@/lib/adventure/play/combat';

const base = (): CombatState => initCombat({ enemyId: 'boss-w1', world: 1, enemyHp: 100, hp: 5, maxHp: 5, relics: [], size: 4, seed: 's' });

describe('flightMath — where a telegraphed attack travels', () => {
  it('given a damaging attack, when it is released, then it flies at the player hearts', () => {
    expect(flightTarget('hit')).toBe('hearts');
    expect(flightTarget('drain')).toBe('hearts');
  });

  it('given a board attack, when it is released, then it flies at the board', () => {
    expect(flightTarget('freeze')).toBe('board');
    expect(flightTarget('curse')).toBe('board');
    expect(flightTarget('shuffle')).toBe('board');
  });

  it('given a projectile attack, when it is released, then no extra missile flies (the shots themselves travel)', () => {
    expect(flightTarget('projectile')).toBeNull();
  });

  it('given each effect, when a missile is drawn, then it uses the matching fx sprite', () => {
    expect(missileArt('freeze')).toBe('/images/adventure/fx/ice-shard.webp');
    expect(missileArt('curse')).toBe('/images/adventure/fx/curse-glyph.webp');
    expect(missileArt('hit')).toBe('/images/adventure/fx/fireball.webp');
  });
});

describe('flightMath — release timing', () => {
  it('given a telegraph with time left, when asked, then the missile leaves TRAVEL_MS before it lands', () => {
    const s = { ...base(), now: 1000, telegraph: { attack: { id: 'hit', effect: 'hit' as const, damage: 1, telegraphMs: 3000 }, startedAt: 1000, endsAt: 4000 } };
    expect(releaseDelay(s)).toBe(3000 - TRAVEL_MS);
  });

  it('given a telegraph already inside the travel window, when asked, then it releases now', () => {
    const s = { ...base(), now: 3800, telegraph: { attack: { id: 'hit', effect: 'hit' as const, damage: 1, telegraphMs: 3000 }, startedAt: 1000, endsAt: 4000 } };
    expect(releaseDelay(s)).toBe(0);
  });

  it('given no telegraph, when asked, then there is nothing to release', () => {
    expect(releaseDelay(base())).toBeNull();
  });
});

describe('flightMath — the consequence line under the banner', () => {
  it('given a freeze landed on 3 tiles, when described, then it names the count and the counter', () => {
    const s = { ...base(), tiles: [
      { kind: 'freeze' as const, key: '0-0', until: 9 }, { kind: 'freeze' as const, key: '0-1', until: 9 }, { kind: 'freeze' as const, key: '0-2', until: 9 },
    ] };
    expect(consequence('freeze', s)).toEqual({ key: 'adventurePlay.combat.consequence.freeze', count: 3 });
  });

  it('given a curse, when described, then the count is cursed tiles and the bite is named', () => {
    const s = { ...base(), tiles: [{ kind: 'curse' as const, key: '1-1', until: 9 }, { kind: 'freeze' as const, key: '0-1', until: 9 }] };
    expect(consequence('curse', s)).toEqual({ key: 'adventurePlay.combat.consequence.curse', count: 1 });
  });

  it('given a hit, when described, then the count is hearts lost', () => {
    expect(consequence('hit', base(), 2)).toEqual({ key: 'adventurePlay.combat.consequence.hit', count: 2 });
  });

  it('given a status that is not a player hit, when described, then there is no consequence line', () => {
    expect(consequence('interrupt', base())).toBeNull();
    expect(consequence('death', base())).toBeNull();
  });

  it('given blocked / shuffle / drain, when described, then each has its own line', () => {
    expect(consequence('blocked', base())?.key).toBe('adventurePlay.combat.consequence.blocked');
    expect(consequence('shuffle', base())?.key).toBe('adventurePlay.combat.consequence.shuffle');
    expect(consequence('drain', base())?.key).toBe('adventurePlay.combat.consequence.drain');
  });
});

describe('flightMath — arc', () => {
  it('given a start and end, when an arc is drawn, then it starts and ends there and bulges upward mid-flight', () => {
    const { xs, ys } = arcPoints({ x: 0, y: 100 }, { x: 200, y: 300 });
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBe(200);
    expect(ys[0]).toBe(100);
    expect(ys[ys.length - 1]).toBe(300);
    const mid = ys[Math.floor(ys.length / 2)];
    expect(mid).toBeLessThan((100 + 300) / 2);
  });
});
