import { describe, it, expect } from 'vitest';
import { flipLatke, latkeStage, newLatkeGame, stepLatke, LATKE_POINTS } from '../latke';

const cookTo = (g: ReturnType<typeof newLatkeGame>, slot: number, cook: number) => {
  g.latkes[slot].cook = cook;
};

describe('Latke Flip', () => {
  it('Given a new pan, then three raw latkes sizzle and the clock runs', () => {
    const g = newLatkeGame(7, 45);
    expect(g.latkes).toHaveLength(3);
    expect(g.latkes.every((l) => latkeStage(l.cook) === 'raw')).toBe(true);
    stepLatke(g, 1);
    expect(g.time).toBeCloseTo(1);
    expect(g.latkes[0].cook).toBeGreaterThan(0);
  });

  it('Given a golden latke in the sweet spot, when flipped, then it scores a perfect and the combo grows', () => {
    const g = newLatkeGame(7, 45);
    cookTo(g, 0, 0.75);
    flipLatke(g, 0);
    expect(g.score).toBe(LATKE_POINTS.perfect);
    expect(g.combo).toBe(1);
    expect(g.latkes[0]).toMatchObject({ side: 1, cook: 0 });
    expect(g.events.map((e) => e.type)).toContain('perfect');
  });

  it('Given both sides flipped golden, then the latke is served and a fresh one takes its spot', () => {
    const g = newLatkeGame(7, 45);
    cookTo(g, 0, 0.75);
    flipLatke(g, 0);
    cookTo(g, 0, 0.66);
    flipLatke(g, 0);
    expect(g.served).toBe(1);
    expect(g.latkes[0].state).toBe('served');
    stepLatke(g, 1);
    expect(g.latkes[0]).toMatchObject({ state: 'cooking', side: 0 });
    expect(g.latkes[0].cook).toBeLessThan(0.4);
  });

  it('Given a raw latke, when flipped too soon, then nothing flips and the combo breaks', () => {
    const g = newLatkeGame(7, 45);
    g.combo = 3;
    cookTo(g, 1, 0.2);
    flipLatke(g, 1);
    expect(g.combo).toBe(0);
    expect(g.latkes[1].side).toBe(0);
    expect(g.events.map((e) => e.type)).toContain('early');
  });

  it('Given a latke left too long, then it burns, costs points and is replaced', () => {
    const g = newLatkeGame(7, 45);
    g.score = 200;
    cookTo(g, 2, 0.999);
    stepLatke(g, 0.2);
    expect(g.latkes[2].state).toBe('burnt');
    expect(g.score).toBe(200 - LATKE_POINTS.burn);
    expect(g.burnt).toBe(1);
    stepLatke(g, 1.5);
    expect(g.latkes[2].state).toBe('cooking');
  });

  it('Given the clock runs out, then the turn is over and more slots opened along the way', () => {
    const g = newLatkeGame(7, 45);
    for (let i = 0; i < 46 * 10; i++) stepLatke(g, 0.1);
    expect(g.over).toBe(true);
    expect(g.latkes.length).toBe(5);
  });
});
