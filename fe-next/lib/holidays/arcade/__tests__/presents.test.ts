import { describe, it, expect } from 'vitest';
import { dropGift, hangingAt, newPresentsGame, stepPresents, SLEIGH } from '../presents';
import { FAMILY_RULES } from '../family';

const run = (g: ReturnType<typeof newPresentsGame>, sec: number, until?: () => boolean) => {
  for (let i = 0; i < sec * 60 && !(until && until()); i++) stepPresents(g, 1 / 60);
};

describe('Present Stack', () => {
  it('Given a new game, then a gift swings from the crane and nothing is stacked', () => {
    const g = newPresentsGame(4, 60);
    expect(g.hanging).not.toBeNull();
    const a = hangingAt(g);
    run(g, 0.5);
    expect(hangingAt(g).x).not.toBeCloseTo(a.x, 0);
    expect(g.gifts).toHaveLength(0);
  });

  it('Given a gift dropped over the sleigh, then it lands, scores and the next gift is hung', () => {
    const g = newPresentsGame(4, 60);
    g.swingT = 0;
    expect(dropGift(g)).toBe(true);
    expect(dropGift(g)).toBe(false);
    run(g, 6, () => g.stacked === 1);
    expect(g.stacked).toBe(1);
    expect(g.score).toBeGreaterThan(0);
    expect(g.hanging).not.toBeNull();
    expect(g.gifts[0].body.position.y).toBeLessThan(SLEIGH.top);
  });

  it('Given a gift dropped past the sleigh, then TIMBER: the whole tower tumbles off, the combo resets, and play goes on', () => {
    const g = newPresentsGame(4, 60);
    g.pivot.x = SLEIGH.x;
    g.swingT = 0;
    dropGift(g);
    run(g, 6, () => g.stacked === 1);
    g.combo = 3;
    const score = g.score;
    g.pivot.x = SLEIGH.x + SLEIGH.w;
    run(g, 2, () => !!g.hanging);
    g.swingT = 0;
    dropGift(g);
    run(g, 6, () => g.events.some((e) => e.type === 'topple'));
    expect(g.events.some((e) => e.type === 'topple')).toBe(true);
    expect(g.over).toBe(false);
    expect(g.gifts).toHaveLength(0);
    expect(g.stacked).toBe(0);
    expect(g.combo).toBe(0);
    expect(g.score).toBe(score);
    expect(g.hanging).not.toBeNull();
  });

  it('Given a player who misses every gift, then the turn still lasts the whole minute', () => {
    const g = newPresentsGame(4, 60);
    g.pivot.x = SLEIGH.x + SLEIGH.w;
    for (let t = 0; t < 59; t += 1 / 60) {
      if (g.hanging) {
        g.swingT = 0;
        dropGift(g);
      }
      stepPresents(g, 1 / 60);
    }
    expect(g.over).toBe(false);
  });

  it('Given any seed, then one golden gift is hung between 15 and 35 seconds, and later levels swing faster', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = newPresentsGame(seed, 60);
      let golden = -1;
      for (let t = 0; t < 40; t += 1 / 60) {
        stepPresents(g, 1 / 60);
        if (golden < 0 && g.events.some((e) => e.type === 'hang' && e.kind === 'gold')) golden = g.time;
        if (g.hanging === 'gold') golden = golden < 0 ? g.time : golden;
        g.events.length = 0;
        if (g.hanging && g.hanging !== 'gold' && g.time > 14) {
          g.swingT = 0;
          dropGift(g);
        }
      }
      expect(golden).toBeGreaterThanOrEqual(15);
      expect(golden).toBeLessThanOrEqual(36);
    }
  });

  it('Given an expert who stacks perfectly all minute, then the score stays inside the server bound', () => {
    const g = newPresentsGame(2, 60);
    g.pivot.x = SLEIGH.x;
    for (let t = 0; t < 61; t += 1 / 60) {
      if (g.hanging && !g.falling) {
        g.swingT = 0;
        dropGift(g);
      }
      stepPresents(g, 1 / 60);
    }
    expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.presents.cap);
    expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.presents.perSecond * 60);
    expect(g.bestHeight).toBeGreaterThan(5);
  });

  it('Given a gift lands right on top of the last one, then it counts as a perfect drop', () => {
    const g = newPresentsGame(4, 60);
    g.pivot.x = SLEIGH.x;
    g.swingT = 0;
    dropGift(g);
    run(g, 6, () => g.stacked === 1);
    g.swingT = 0;
    dropGift(g);
    run(g, 6, () => g.stacked === 2);
    expect(g.stacked).toBe(2);
    expect(g.events.some((e) => e.type === 'perfect')).toBe(true);
  });

  it('Given the clock runs out, then the turn ends without a topple', () => {
    const g = newPresentsGame(4, 2);
    run(g, 3);
    expect(g.over).toBe(true);
  });
});
