import { describe, it, expect } from 'vitest';
import { FAMILY_RULES } from '../family';
import { PARTY_S, HOLES, newSplatGame, stepSplat, throwBall, SPLAT_POINTS, ballAt, FLIGHT_S, THROW_FROM } from '../splat';

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

  it('Given any seed, then the gremlin party fires once between 15 and 35 seconds and fills every fort with gremlins', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = newSplatGame(seed, 50);
      let at = -1;
      for (let t = 0; t < 40 && at < 0; t += 1 / 60) {
        stepSplat(g, 1 / 60);
        if (g.events.some((e) => e.type === 'party')) at = g.time;
        g.events.length = 0;
      }
      expect(at).toBeGreaterThanOrEqual(15);
      expect(at).toBeLessThanOrEqual(35);
      for (let t = 0; t < 1; t += 1 / 60) stepSplat(g, 1 / 60);
      expect(g.party).toBeGreaterThan(PARTY_S - 1.5);
      expect(g.pops.filter((p) => p.kind === 'gremlin').length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Given later levels, then pop-ups come faster and leave sooner', () => {
    const g = newSplatGame(3, 50);
    let early = 0;
    let late = 0;
    for (let t = 0; t < 50; t += 1 / 60) {
      stepSplat(g, 1 / 60);
      for (const e of g.events) if (e.type === 'spawn') (g.time < 12 ? (early += 1) : g.time > 38 ? (late += 1) : 0);
      g.events.length = 0;
    }
    expect(late).toBeGreaterThan(early * 1.2);
  });

  it('Given a sharpshooter all game, then the score stays inside the server bound', () => {
    const g = newSplatGame(5, 50);
    for (let t = 0; t < 51; t += 1 / 60) {
      const up = g.pops.find((p) => p.phase === 'up' && p.kind !== 'mascot');
      if (up) throwBall(g, HOLES[up.hole].x, HOLES[up.hole].y - 60);
      stepSplat(g, 1 / 60);
    }
    expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.splat.cap);
    expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.splat.perSecond * 50);
    expect(g.hits).toBeGreaterThan(20);
  });

  it('Given the first seconds, then a sneaky gremlin shows up early so something exciting happens right away', () => {
    const g = newSplatGame(8, 50);
    let at = -1;
    for (let t = 0; t < 8 && at < 0; t += 1 / 60) {
      stepSplat(g, 1 / 60);
      if (g.pops.some((p) => p.kind === 'gremlin')) at = g.time;
    }
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(6.5);
  });
});
