import { describe, it, expect } from 'vitest';
import { newCatchParty, stepCatchParty, steerCatch, catchSnapshot } from '../catchParty';
import { CATCH_FIELD as CATCH } from '../field';

const ids = ['a', 'b', 'c'];

describe('Sufganiyah Catch party', () => {
  it('Given three players, then each gets a plate spread across the counter', () => {
    const g = newCatchParty(1, 60, ids);
    const xs = g.plates.map((p) => p.x);
    expect(xs).toHaveLength(3);
    expect(new Set(xs).size).toBe(3);
  });

  it('Given a doughnut lands on one plate, then only that player scores', () => {
    const g = newCatchParty(1, 60, ids);
    const b = g.plates[1];
    g.items.push({ id: 99, kind: 'dough', x: b.x, y: CATCH.plateY - 4, vx: 0, vy: 300, spin: 0 });
    stepCatchParty(g, 1 / 30);
    expect(g.plates.map((p) => p.score)).toEqual([0, expect.any(Number), 0]);
    expect(b.score).toBeGreaterThan(0);
    expect(g.events.some((e) => e.type === 'catch' && e.player === 'b')).toBe(true);
  });

  it('Given a phone steers, then that plate moves toward the target and stays on the counter', () => {
    const g = newCatchParty(1, 60, ids);
    steerCatch(g, 'a', 2);
    for (let i = 0; i < 30; i++) stepCatchParty(g, 1 / 30);
    expect(g.plates[0].x).toBe(CATCH.maxX);
    steerCatch(g, 'zz', 0.5);
  });

  it('Given a snapshot, then it is small and carries everything the big screen draws', () => {
    const g = newCatchParty(1, 60, ids);
    for (let i = 0; i < 90; i++) stepCatchParty(g, 1 / 30);
    const s = catchSnapshot(g);
    expect(s.plates).toHaveLength(3);
    expect(s.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(s).length).toBeLessThan(4000);
  });

  it('Given the clock runs out, then the round is over and a golden doughnut fell along the way', () => {
    const g = newCatchParty(1, 60, ids);
    let golden = false;
    for (let i = 0; i < 61 * 30; i++) {
      stepCatchParty(g, 1 / 30);
      if (g.events.some((e) => e.type === 'spawn' && e.kind === 'golden')) golden = true;
      g.events.length = 0;
    }
    expect(g.over).toBe(true);
    expect(golden).toBe(true);
  });
});
