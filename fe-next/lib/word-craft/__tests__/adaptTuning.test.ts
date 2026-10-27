import { describe, it, expect } from 'vitest';
import { adaptTuning, botTuning } from '../botDifficulty';

describe('adaptTuning (rubber band)', () => {
  const easy = botTuning('easy');

  it('leaves tuning untouched on an even board or an empty one', () => {
    expect(adaptTuning(easy, 5, 5)).toEqual(easy);
    expect(adaptTuning(easy, 0, 0)).toEqual(easy);
    expect(adaptTuning(easy, 6, 5)).toEqual(easy);
  });

  it('eases the bot when the player is well behind', () => {
    const t = adaptTuning(easy, 2, 12);
    expect(t.turnSkipChance).toBeGreaterThan(easy.turnSkipChance);
    expect(t.maxLength).toBeLessThan(easy.maxLength);
    expect(t.captureAggression).toBe(0);
  });

  it('tightens the bot when the player runs away with it', () => {
    const t = adaptTuning(easy, 14, 3);
    expect(t.turnSkipChance).toBeLessThan(easy.turnSkipChance);
    expect(t.captureAggression).toBeGreaterThan(easy.captureAggression);
    expect(t.maxLength).toBeGreaterThanOrEqual(easy.maxLength);
  });

  it('stays inside sane bounds for every difficulty', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      for (const [p, b] of [[0, 30], [30, 0], [10, 10]] as const) {
        const t = adaptTuning(botTuning(d), p, b);
        expect(t.maxLength).toBeGreaterThanOrEqual(3);
        expect(t.maxLength).toBeLessThanOrEqual(7);
        expect(t.turnSkipChance).toBeGreaterThanOrEqual(0);
        expect(t.turnSkipChance).toBeLessThanOrEqual(0.6);
        expect(t.captureAggression).toBeGreaterThanOrEqual(0);
        expect(t.captureAggression).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never turns easy into hard', () => {
    const t = adaptTuning(easy, 30, 0);
    expect(t.maxLength).toBeLessThan(botTuning('hard').maxLength);
  });
});
