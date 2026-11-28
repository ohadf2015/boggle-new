import { describe, it, expect } from 'vitest';
import { dashSnapshot, holdParty, newDashParty, stepDashParty } from '../dashParty';
import { DASH } from '../../dash';
import { DASH_FIELD } from '../field';

const run = (g: ReturnType<typeof newDashParty>, s: number) => {
  for (let i = 0; i < s * 30; i++) stepDashParty(g, 1 / 30);
};

describe('Sleigh Dash party', () => {
  it('Given three players, then each flies their own sleigh in a staggered column', () => {
    const g = newDashParty(2, 60, ['a', 'b', 'c']);
    expect(new Set(g.sleighs.map((s) => s.x)).size).toBe(3);
  });

  it('Given one phone holds, then only that sleigh climbs', () => {
    const g = newDashParty(2, 60, ['a', 'b']);
    run(g, 4);
    const [a0, b0] = g.sleighs.map((s) => s.y);
    holdParty(g, 'a', true);
    run(g, 0.4);
    expect(g.sleighs[0].y).toBeLessThan(a0);
    expect(g.sleighs[1].y).toBeGreaterThanOrEqual(b0 - 1);
  });

  it('Given two sleighs reach the same gift, then only one player collects it', () => {
    const g = newDashParty(2, 60, ['a', 'b']);
    g.sleighs.forEach((s) => (s.y = 500));
    g.gifts.push({ id: 77, x: g.sleighs[0].x, y: 500 });
    g.gifts.push({ id: 78, x: g.sleighs[1].x + 4, y: 500 });
    stepDashParty(g, 1 / 30);
    const total = g.sleighs.reduce((n, s) => n + s.collected, 0);
    expect(total).toBe(2);
    expect(g.gifts.some((x) => x.id === 77 || x.id === 78)).toBe(false);
  });

  it('Given an owl in one lane, then only the sleigh that hits it tumbles', () => {
    const g = newDashParty(2, 60, ['a', 'b']);
    g.sleighs[0].y = 300;
    g.sleighs[1].y = DASH_FIELD.floor - 40;
    g.obstacles.push({ id: 9, kind: 'owl', x: g.sleighs[0].x, y: 300, baseY: 300, phase: 0, top: 0, passed: false, near: Infinity });
    stepDashParty(g, 1 / 30);
    expect(g.sleighs[0].hurt).toBeGreaterThan(0);
    expect(g.sleighs[1].hurt).toBe(0);
  });

  it('Given a full round, then it ends and the snapshot fits in a small packet', () => {
    const g = newDashParty(2, 60, ['a', 'b', 'c', 'd']);
    run(g, 20);
    expect(JSON.stringify(dashSnapshot(g)).length).toBeLessThan(4000);
    run(g, 41);
    expect(g.over).toBe(true);
    expect(g.sleighs[0].x).toBeGreaterThan(DASH.hitR);
  });
});
