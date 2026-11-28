import { describe, it, expect } from 'vitest';
import { CATCH, catchPoints, FRENZY_S, movePlate, newCatchGame, stepCatch, type CatchGame } from '../catch';
import { FAMILY_RULES } from '../family';

const run = (g: CatchGame, seconds: number, each?: (g: CatchGame) => void) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    each?.(g);
    stepCatch(g, 1 / 60);
  }
};

const perfectBot = (g: CatchGame) => {
  const good = g.items.filter((i) => i.kind !== 'burnt').sort((a, b) => b.y - a.y)[0];
  if (good) movePlate(g, good.x);
};

describe('Sufganiyah Catch', () => {
  it('Given the first seconds, then doughnuts fall at once and only doughnuts', () => {
    const g = newCatchGame(3, 60);
    run(g, 3);
    expect(g.items.length).toBeGreaterThan(0);
    expect(g.items.every((i) => i.kind === 'dough')).toBe(true);
  });

  it('Given a doughnut lands on the plate, then it scores and the combo grows', () => {
    const g = newCatchGame(3, 60);
    g.items.push({ id: 99, kind: 'dough', x: g.plate.x, y: CATCH.plateY - 5, vx: 0, vy: 300, spin: 0 });
    stepCatch(g, 1 / 30);
    expect(g.score).toBe(catchPoints('dough', 0, false));
    expect(g.combo).toBe(1);
    expect(g.events.some((e) => e.type === 'catch')).toBe(true);
  });

  it('Given a doughnut hits the floor, then it splats jelly and the combo resets without losing points', () => {
    const g = newCatchGame(3, 60);
    g.combo = 6;
    g.score = 100;
    g.items.push({ id: 99, kind: 'dough', x: g.plate.x + 400, y: CATCH.floorY - 2, vx: 0, vy: 300, spin: 0 });
    stepCatch(g, 1 / 30);
    expect(g.combo).toBe(0);
    expect(g.score).toBe(100);
    expect(g.events.some((e) => e.type === 'splat')).toBe(true);
  });

  it('Given a burnt latke on the plate, then points drop, the combo resets and the plate wobbles', () => {
    const g = newCatchGame(3, 60);
    g.score = 100;
    g.combo = 4;
    g.items.push({ id: 99, kind: 'burnt', x: g.plate.x, y: CATCH.plateY - 5, vx: 0, vy: 300, spin: 0 });
    stepCatch(g, 1 / 30);
    expect(g.score).toBeLessThan(100);
    expect(g.combo).toBe(0);
    expect(g.stun).toBeGreaterThan(0);
  });

  it('Given the golden sufganiyah is caught, then a frenzy rains doughnuts for 5 seconds with no burnt latkes', () => {
    const g = newCatchGame(3, 60);
    g.time = 30;
    g.items.push({ id: 99, kind: 'golden', x: g.plate.x, y: CATCH.plateY - 5, vx: 0, vy: 300, spin: 0 });
    stepCatch(g, 1 / 30);
    expect(FRENZY_S).toBe(5);
    expect(g.frenzy).toBeGreaterThan(4.9);
    const before = g.nextId;
    run(g, 2);
    expect(g.nextId - before).toBeGreaterThan(10);
    expect(g.items.some((i) => i.kind === 'burnt')).toBe(false);
  });

  it('Given any seed, then the golden sufganiyah appears once between 15 and 35 seconds and burnt latkes join after 12', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = newCatchGame(seed, 60);
      let golden = -1;
      let firstBurnt = -1;
      run(g, 40, (x) => {
        for (const e of x.events) if (e.type === 'spawn' && e.kind === 'golden' && golden < 0) golden = x.time;
        for (const e of x.events) if (e.type === 'spawn' && e.kind === 'burnt' && firstBurnt < 0) firstBurnt = x.time;
      });
      expect(golden).toBeGreaterThanOrEqual(15);
      expect(golden).toBeLessThanOrEqual(35);
      expect(firstBurnt).toBeGreaterThanOrEqual(12);
    }
  });

  it('Given later levels, then doughnuts fall faster', () => {
    const g = newCatchGame(5, 60);
    run(g, 2);
    const early = Math.max(...g.items.map((i) => i.vy));
    run(g, 48);
    const late = Math.max(...g.items.map((i) => i.vy));
    expect(late).toBeGreaterThan(early * 1.4);
  });

  it('Given a perfect player for a full run, then the score stays inside the server bound', () => {
    for (const seed of [1, 2, 3]) {
      const g = newCatchGame(seed, 60);
      run(g, 61, perfectBot);
      expect(g.over).toBe(true);
      expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.catch.cap);
      expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.catch.perSecond * 60);
      expect(g.score).toBeGreaterThan(2500);
    }
  });

  it('Given an idle player, then the run still lasts the full minute', () => {
    const g = newCatchGame(9, 60);
    run(g, 59);
    expect(g.over).toBe(false);
    run(g, 1.1);
    expect(g.over).toBe(true);
  });

  it('Given the plate is pushed to an edge, then it stays fully on the counter', () => {
    const g = newCatchGame(3, 60);
    movePlate(g, -500);
    run(g, 1);
    expect(g.plate.x - CATCH.halfPlate).toBeGreaterThanOrEqual(20);
    movePlate(g, 5000);
    run(g, 1);
    expect(g.plate.x + CATCH.halfPlate).toBeLessThanOrEqual(748);
  });
});
