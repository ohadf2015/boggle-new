import { describe, it, expect } from 'vitest';
import { HOLES, newSplatGame, stepSplat, throwBall, SPLAT_POINTS, ballAt, FLIGHT_S, THROW_FROM } from '../splat';

describe('Snowball Splat', () => {
  it('Given time passes, then pop-ups appear in free holes', () => {
    const g = newSplatGame(3, 40);
    for (let i = 0; i < 30; i++) stepSplat(g, 0.1);
    expect(g.pops.length).toBeGreaterThan(0);
    const holes = g.pops.map((p) => p.hole);
    expect(new Set(holes).size).toBe(holes.length);
  });

  it('Given a snowball thrown at an elf, when it lands, then the elf is splatted for points', () => {
    const g = newSplatGame(3, 40);
    g.pops = [{ id: 1, hole: 0, kind: 'elf', phase: 'up', t: 0, life: 2 }];
    const h = HOLES[0];
    throwBall(g, h.x, h.y - 40);
    stepSplat(g, FLIGHT_S + 0.01);
    expect(g.pops[0].phase).toBe('hit');
    expect(g.score).toBe(SPLAT_POINTS.elf);
    expect(g.hits).toBe(1);
  });

  it('Given the mascot is hit by mistake, then it costs points and breaks the combo', () => {
    const g = newSplatGame(3, 40);
    g.score = 300;
    g.combo = 4;
    g.pops = [{ id: 1, hole: 1, kind: 'mascot', phase: 'up', t: 0, life: 2 }];
    throwBall(g, HOLES[1].x, HOLES[1].y - 40);
    stepSplat(g, FLIGHT_S + 0.01);
    expect(g.score).toBe(300 + SPLAT_POINTS.mascot);
    expect(g.combo).toBe(0);
    expect(g.events.some((e) => e.type === 'oops')).toBe(true);
  });

  it('Given a throw at empty snow, then it misses and splats on the ground', () => {
    const g = newSplatGame(3, 40);
    g.pops = [];
    throwBall(g, 384, 1250);
    stepSplat(g, FLIGHT_S + 0.01);
    expect(g.events.some((e) => e.type === 'miss')).toBe(true);
    expect(g.score).toBe(0);
  });

  it('Given a thrown ball, then it flies in an arc from the bottom to its target', () => {
    const mid = ballAt({ id: 1, x: 300, y: 600, t: FLIGHT_S / 2 });
    expect(mid.y).toBeLessThan((THROW_FROM.y + 600) / 2 - 200);
    const end = ballAt({ id: 1, x: 300, y: 600, t: FLIGHT_S });
    expect(end).toMatchObject({ x: 300, y: 600 });
  });

  it('Given the clock runs out, then the turn ends', () => {
    const g = newSplatGame(3, 5);
    for (let i = 0; i < 60; i++) stepSplat(g, 0.1);
    expect(g.over).toBe(true);
  });
});
