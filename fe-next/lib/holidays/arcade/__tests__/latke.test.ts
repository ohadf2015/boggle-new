import { describe, it, expect } from 'vitest';
import { burnPenalty, flipLatke, isPerfect, latkeStage, newLatkeGame, stepLatke, LATKE_POINTS, STAR_MULT } from '../latke';
import { FAMILY_RULES } from '../family';

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
    expect(g.score).toBe(200 - burnPenalty(0));
    expect(burnPenalty(0)).toBe(0);
    expect(burnPenalty(4)).toBeLessThanOrEqual(5);
    expect(g.burnt).toBe(1);
    stepLatke(g, 1.5);
    expect(g.latkes[2].state).toBe('cooking');
  });

  it('Given the clock runs out, then the turn is over and more slots opened along the way', () => {
    const g = newLatkeGame(7, 60);
    for (let i = 0; i < 61 * 10; i++) stepLatke(g, 0.1);
    expect(g.over).toBe(true);
    expect(g.latkes.length).toBe(5);
  });

  it('Given the levels, then a fourth latke joins at 12 seconds and a fifth at 36', () => {
    const g = newLatkeGame(7, 60);
    for (let i = 0; i < 11.5 * 60; i++) stepLatke(g, 1 / 60);
    expect(g.latkes.length).toBe(3);
    for (let i = 0; i < 1 * 60; i++) stepLatke(g, 1 / 60);
    expect(g.latkes.length).toBe(4);
    for (let i = 0; i < 24 * 60; i++) stepLatke(g, 1 / 60);
    expect(g.latkes.length).toBe(5);
  });

  it('Given any seed, then one star latke sizzles in between 15 and 35 seconds and a perfect flip on it pays triple', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = newLatkeGame(seed, 60);
      let at = -1;
      for (let i = 0; i < 40 * 60 && at < 0; i++) {
        stepLatke(g, 1 / 60);
        if (g.latkes.some((l) => l.star)) at = g.time;
      }
      expect(at).toBeGreaterThanOrEqual(15);
      expect(at).toBeLessThanOrEqual(37);
    }
    const g = newLatkeGame(3, 60);
    g.latkes[0].star = true;
    g.latkes[0].cook = 0.75;
    flipLatke(g, 0);
    expect(g.score).toBe(LATKE_POINTS.perfect * STAR_MULT);
  });

  it('Given a perfect cook all minute, then the score stays inside the server bound', () => {
    const g = newLatkeGame(4, 60);
    for (let i = 0; i < 61 * 60; i++) {
      g.latkes.forEach((l, slot) => {
        if (l.state === 'cooking' && isPerfect(l.cook)) flipLatke(g, slot);
      });
      stepLatke(g, 1 / 60);
    }
    expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.latke.cap);
    expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.latke.perSecond * 60);
    expect(g.served).toBeGreaterThan(20);
  });
});
