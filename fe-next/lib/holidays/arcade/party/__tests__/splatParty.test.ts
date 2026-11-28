import { describe, it, expect } from 'vitest';
import { newSplatParty, splatSnapshot, stepSplatParty, throwAtHole, throwParty } from '../splatParty';
import { FLIGHT_S, SPLAT_POINTS } from '../../splat';
import { PARTY_HOLES as HOLES } from '../field';

describe('Snowball Splat party', () => {
  it('Given two players throw at the same elf, then the first snowball to land gets the points', () => {
    const g = newSplatParty(2, 50, ['a', 'b']);
    g.pops = [{ id: 1, hole: 0, kind: 'elf', phase: 'up', t: 0, life: 3 }];
    const h = HOLES[0];
    expect(throwParty(g, 'b', h.x, h.y - 40)).toBe(true);
    stepSplatParty(g, 0.05);
    throwParty(g, 'a', h.x, h.y - 40);
    stepSplatParty(g, FLIGHT_S);
    expect(g.players.find((p) => p.id === 'b')!.score).toBe(SPLAT_POINTS.elf);
    expect(g.players.find((p) => p.id === 'a')!.score).toBe(0);
  });

  it('Given a player splats the mascot, then only that player loses points', () => {
    const g = newSplatParty(2, 50, ['a', 'b']);
    g.players.forEach((p) => (p.score = 300));
    g.pops = [{ id: 1, hole: 1, kind: 'mascot', phase: 'up', t: 0, life: 3 }];
    throwParty(g, 'a', HOLES[1].x, HOLES[1].y - 40);
    stepSplatParty(g, FLIGHT_S + 0.01);
    expect(g.players.map((p) => p.score)).toEqual([300 + SPLAT_POINTS.mascot, 300]);
  });

  it('Given a player throws too fast, then their snowballs are capped but others can still throw', () => {
    const g = newSplatParty(2, 50, ['a', 'b']);
    expect([1, 2, 3, 4].map(() => throwParty(g, 'a', 300, 600))).toEqual([true, true, false, false]);
    expect(throwParty(g, 'b', 300, 600)).toBe(true);
  });

  it('Given the round, then more forts fill for a bigger party and the snapshot names each ball owner', () => {
    const g = newSplatParty(3, 50, ['a', 'b', 'c', 'd', 'e']);
    for (let i = 0; i < 30 * 5; i++) stepSplatParty(g, 1 / 30);
    expect(throwAtHole(g, 'c', 3)).toBe(true);
    expect(throwAtHole(g, 'c', 99)).toBe(false);
    const s = splatSnapshot(g);
    expect(s.balls[0][1]).toBe('c');
    expect(s.players).toHaveLength(5);
    for (let i = 0; i < 30 * 50; i++) stepSplatParty(g, 1 / 30);
    expect(g.over).toBe(true);
  });
});
