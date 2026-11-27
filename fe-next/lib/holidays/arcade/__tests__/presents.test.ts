import { describe, it, expect } from 'vitest';
import { dropGift, hangingAt, LIVES, newPresentsGame, stepPresents, SLEIGH } from '../presents';

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

  it('Given a gift dropped past the sleigh, then it costs a life and the next gift is hung', () => {
    const g = newPresentsGame(4, 60);
    g.pivot.x = SLEIGH.x + SLEIGH.w;
    g.swingT = 0;
    dropGift(g);
    run(g, 6, () => g.lives < LIVES);
    expect(g.lives).toBe(LIVES - 1);
    expect(g.over).toBe(false);
    expect(g.gifts).toHaveLength(0);
    expect(g.hanging).not.toBeNull();
    expect(g.events.some((e) => e.type === 'miss')).toBe(true);
  });

  it('Given every life is lost, then the tower topples and the turn ends', () => {
    const g = newPresentsGame(4, 60);
    g.pivot.x = SLEIGH.x + SLEIGH.w;
    for (let i = 0; i < LIVES; i++) {
      run(g, 2, () => !!g.hanging);
      g.swingT = 0;
      dropGift(g);
      run(g, 6, () => g.lives < LIVES - i || g.over);
    }
    expect(g.over).toBe(true);
    expect(g.toppled).toBe(true);
    expect(g.events.some((e) => e.type === 'topple')).toBe(true);
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
    expect(g.toppled).toBe(false);
  });
});
