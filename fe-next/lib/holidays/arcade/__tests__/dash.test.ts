import { describe, it, expect } from 'vitest';
import { DASH, hold, newDashGame, stepDash, TURBO_S, type DashGame } from '../dash';
import { FAMILY_RULES } from '../family';

const run = (g: DashGame, seconds: number, each?: (g: DashGame) => void) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    each?.(g);
    stepDash(g, 1 / 60);
  }
};

const pilot = (g: DashGame) => {
  const danger = g.obstacles.filter((o) => o.x > DASH.sleighX - 80 && o.x < DASH.sleighX + 360).sort((a, b) => a.x - b.x)[0];
  const gift = g.gifts.filter((o) => o.x > DASH.sleighX && o.x < DASH.sleighX + 300).sort((a, b) => a.x - b.x)[0];
  let target = gift ? gift.y : 520;
  if (danger) target = danger.kind === 'plume' ? Math.min(target, danger.top - 140) : danger.y > 600 ? danger.y - 260 : danger.y + 260;
  hold(g, g.y > target + 20 || (g.y > target && g.vy > 0));
};

describe('Sleigh Dash', () => {
  it('Given the run starts, then the sleigh glides and gifts are already on the way', () => {
    const g = newDashGame(4, 60);
    run(g, 2);
    expect(g.gifts.length + g.collected).toBeGreaterThan(0);
    expect(g.y).toBeGreaterThan(DASH.ceiling);
    expect(g.y).toBeLessThan(DASH.floor);
  });

  it('Given the player holds, then the sleigh climbs, and lets go, then it sinks', () => {
    const g = newDashGame(4, 60);
    run(g, 4);
    const y0 = g.y;
    hold(g, true);
    run(g, 0.5);
    expect(g.y).toBeLessThan(y0);
    hold(g, false);
    const y1 = g.y;
    run(g, 0.8);
    expect(g.y).toBeGreaterThan(y1);
  });

  it('Given an idle player, then the sleigh bumps along the rooftops and the run still lasts the full minute', () => {
    const g = newDashGame(4, 60);
    run(g, 59);
    expect(g.over).toBe(false);
    expect(g.y).toBeLessThanOrEqual(DASH.floor);
    run(g, 1.1);
    expect(g.over).toBe(true);
  });

  it('Given the sleigh flies into an owl, then it tumbles, loses its combo and some points, and is safe for a moment', () => {
    const g = newDashGame(4, 60);
    g.pace.level = 2;
    g.score = 200;
    g.combo = 5;
    g.obstacles.push({ id: 99, kind: 'owl', x: DASH.sleighX, y: g.y, baseY: g.y, phase: 0, top: 0, passed: false, near: Infinity });
    stepDash(g, 1 / 60);
    expect(g.combo).toBe(0);
    expect(g.score).toBeLessThan(200);
    expect(g.hurt).toBeGreaterThan(0);
    expect(g.events.some((e) => e.type === 'crash')).toBe(true);
    const s = g.score;
    g.obstacles.push({ id: 100, kind: 'owl', x: DASH.sleighX, y: g.y, baseY: g.y, phase: 0, top: 0, passed: false, near: Infinity });
    stepDash(g, 1 / 60);
    expect(g.score).toBe(s);
  });

  it('Given a gift touched, then it is collected and the combo grows', () => {
    const g = newDashGame(4, 60);
    g.gifts.push({ id: 99, x: DASH.sleighX, y: g.y });
    stepDash(g, 1 / 60);
    expect(g.collected).toBe(1);
    expect(g.combo).toBe(1);
    expect(g.score).toBeGreaterThan(0);
  });

  it('Given a plume passed by a hair, then a near-miss bonus pays out once', () => {
    const g = newDashGame(4, 60);
    g.y = 600;
    g.vy = 0;
    const top = g.y + DASH.hitR + 20;
    g.obstacles.push({ id: 99, kind: 'plume', x: DASH.sleighX + 10, y: top, baseY: top, phase: 0, top, passed: false, near: Infinity });
    hold(g, true);
    run(g, 1.2);
    expect(g.nearMisses).toBe(1);
  });

  it('Given any seed, then the turbo star shows once between 15 and 35 seconds and owls only join after 12', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = newDashGame(seed, 60);
      let star = -1;
      let owl = -1;
      run(g, 40, (x) => {
        for (const e of x.events) {
          if (e.type === 'star' && star < 0) star = x.time;
          if (e.type === 'spawn' && e.kind === 'owl' && owl < 0) owl = x.time;
        }
      });
      expect(star).toBeGreaterThanOrEqual(15);
      expect(star).toBeLessThanOrEqual(35);
      expect(owl).toBeGreaterThanOrEqual(12);
    }
  });

  it('Given the turbo star is grabbed, then the sleigh speeds up and cannot crash for a few seconds', () => {
    const g = newDashGame(4, 60);
    g.star = { x: DASH.sleighX, y: g.y };
    const speed = g.speed;
    stepDash(g, 1 / 60);
    expect(g.turbo).toBeCloseTo(TURBO_S, 1);
    expect(g.speed).toBeGreaterThan(speed);
    g.obstacles.push({ id: 99, kind: 'owl', x: DASH.sleighX, y: g.y, baseY: g.y, phase: 0, top: 0, passed: false, near: Infinity });
    stepDash(g, 1 / 60);
    expect(g.hurt).toBe(0);
  });

  it('Given later levels, then the world scrolls faster', () => {
    const g = newDashGame(4, 60);
    run(g, 2);
    const early = g.speed;
    run(g, 48);
    expect(g.speed).toBeGreaterThan(early * 1.4);
  });

  it('Given a good pilot for a full run, then the score stays inside the server bound', () => {
    for (const seed of [1, 2, 3]) {
      const g = newDashGame(seed, 60);
      run(g, 61, pilot);
      expect(g.over).toBe(true);
      expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.dash.cap);
      expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.dash.perSecond * 60);
      expect(g.collected).toBeGreaterThan(20);
    }
  });

  it('Given the first 24 seconds, then a crash is a funny tumble that costs no points', () => {
    const g = newDashGame(4, 60);
    g.score = 50;
    g.obstacles.push({ id: 99, kind: 'owl', x: DASH.sleighX, y: g.y, baseY: g.y, phase: 0, top: 0, passed: false, near: Infinity });
    stepDash(g, 1 / 60);
    expect(g.hurt).toBeGreaterThan(0);
    expect(g.score).toBe(50);
  });
});
