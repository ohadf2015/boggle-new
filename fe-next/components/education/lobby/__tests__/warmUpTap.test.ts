import { describe, it, expect } from 'vitest';
import { WARM_UP_TILES, initialWarmUp, warmUpLetters, warmUpReducer } from '../warmUpTap';

describe('warmUpLetters — the warm-up board is made of the student’s own name', () => {
  it('Given a name, Then the tiles spell it (uppercased), padded from LEXICLASH', () => {
    const letters = warmUpLetters('Maya');
    expect(letters).toHaveLength(WARM_UP_TILES);
    expect(letters.slice(0, 4).join('')).toBe('MAYA');
    expect(letters.slice(4).every((l) => /^[A-Z]$/.test(l))).toBe(true);
  });

  it('Given a long or non-Latin name, Then it keeps letters only and caps at the tile count', () => {
    expect(warmUpLetters('Alexandria-Rose 2')).toHaveLength(WARM_UP_TILES);
    expect(warmUpLetters('Alexandria-Rose 2').join('')).toMatch(/^[\p{L}]+$/u);
    expect(warmUpLetters('נועה').slice(0, 4).join('')).toBe('נועה');
  });

  it('Given an empty name, Then it still deals a full board', () => {
    expect(warmUpLetters('')).toHaveLength(WARM_UP_TILES);
  });
});

describe('warmUpReducer — tap the lit tile', () => {
  it('starts with one lit tile, zero score and no combo', () => {
    const s = initialWarmUp(7);
    expect(s.hot).toBeGreaterThanOrEqual(0);
    expect(s.hot).toBeLessThan(WARM_UP_TILES);
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
  });

  it('Given a tap on the lit tile, Then score and combo rise and a DIFFERENT tile lights', () => {
    const s0 = initialWarmUp(3);
    const s1 = warmUpReducer(s0, { type: 'tap', index: s0.hot });
    expect(s1.score).toBe(1);
    expect(s1.combo).toBe(1);
    expect(s1.hot).not.toBe(s0.hot);
    expect(s1.lastHit).toBe(true);
  });

  it('Given a miss, Then the combo resets but the score is kept (no punishment for a warm-up)', () => {
    let s = initialWarmUp(3);
    s = warmUpReducer(s, { type: 'tap', index: s.hot });
    s = warmUpReducer(s, { type: 'tap', index: s.hot });
    const miss = (s.hot + 1) % WARM_UP_TILES;
    const after = warmUpReducer(s, { type: 'tap', index: miss });
    expect(after.score).toBe(2);
    expect(after.combo).toBe(0);
    expect(after.hot).toBe(s.hot);
    expect(after.lastHit).toBe(false);
  });

  it('tracks the best combo across misses', () => {
    let s = initialWarmUp(11);
    for (let i = 0; i < 4; i++) s = warmUpReducer(s, { type: 'tap', index: s.hot });
    s = warmUpReducer(s, { type: 'tap', index: (s.hot + 1) % WARM_UP_TILES });
    s = warmUpReducer(s, { type: 'tap', index: s.hot });
    expect(s.best).toBe(4);
    expect(s.combo).toBe(1);
  });

  it('is deterministic for a seed (no Math.random in render)', () => {
    const run = () => {
      let s = initialWarmUp(42);
      const hots = [s.hot];
      for (let i = 0; i < 5; i++) {
        s = warmUpReducer(s, { type: 'tap', index: s.hot });
        hots.push(s.hot);
      }
      return hots;
    };
    expect(run()).toEqual(run());
  });

  it('ignores an out-of-range tap', () => {
    const s = initialWarmUp(1);
    expect(warmUpReducer(s, { type: 'tap', index: 99 })).toBe(s);
  });
});
