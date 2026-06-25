import { describe, it, expect } from 'vitest';
import { pushLeanOffset, leanFromOffsets, relaxLean, LEAN_HISTORY_MAX, LEAN_MAX_DEG } from '../towerLean';

describe('relaxLean — Quick Recovery straightens the tower faster', () => {
  it('×1 is a no-op (base game untouched)', () => {
    const hist = [0.4, -0.6, 0.8];
    expect(relaxLean(hist, 1)).toEqual(hist);
  });

  it('shrinks every offset toward 0, reducing the visible lean', () => {
    const hist = [0.8, 0.8, 0.8];
    const relaxed = relaxLean(hist, 2);
    expect(relaxed).toEqual([0.4, 0.4, 0.4]);
    expect(Math.abs(leanFromOffsets(relaxed))).toBeLessThan(Math.abs(leanFromOffsets(hist)));
  });

  it('never flips the lean sign and returns a fresh array', () => {
    const hist = [-0.5, -0.9];
    const relaxed = relaxLean(hist, 1.5);
    expect(relaxed).not.toBe(hist);
    expect(relaxed.every((o) => o <= 0)).toBe(true);
  });
});

describe('pushLeanOffset — rolling window of signed drop offsets', () => {
  it('appends to the end', () => {
    expect(pushLeanOffset([], 0.3)).toEqual([0.3]);
    expect(pushLeanOffset([0.1], -0.2)).toEqual([0.1, -0.2]);
  });

  it('drops oldest once length exceeds LEAN_HISTORY_MAX', () => {
    const full = Array.from({ length: LEAN_HISTORY_MAX }, (_, i) => i * 0.01);
    const next = pushLeanOffset(full, 0.99);
    expect(next.length).toBe(LEAN_HISTORY_MAX);
    expect(next[0]).toBe(0.01); // oldest dropped
    expect(next[next.length - 1]).toBe(0.99);
  });

  it('clamps the incoming offset into [-1, 1]', () => {
    expect(pushLeanOffset([], 2)[0]).toBe(1);
    expect(pushLeanOffset([], -2)[0]).toBe(-1);
  });
});

describe('leanFromOffsets — weighted lean angle (deg)', () => {
  it('returns 0 for an empty history', () => {
    expect(leanFromOffsets([])).toBe(0);
  });

  it('returns 0 for all-zero history (perfect drops never lean)', () => {
    expect(leanFromOffsets([0, 0, 0, 0])).toBe(0);
  });

  it('positive offsets lean positive (right)', () => {
    expect(leanFromOffsets([0.4, 0.5, 0.6])).toBeGreaterThan(0);
  });

  it('negative offsets lean negative (left)', () => {
    expect(leanFromOffsets([-0.4, -0.5, -0.6])).toBeLessThan(0);
  });

  it('recent offsets weigh more than ancient ones', () => {
    // Long history of perfect drops, then one big lean → angle reflects the recent drop
    const ancient = Array.from({ length: 8 }, () => 0);
    const recentLean = leanFromOffsets([...ancient, 0.9]);
    const balanced = leanFromOffsets([0.9, ...ancient]);
    expect(Math.abs(recentLean)).toBeGreaterThan(Math.abs(balanced));
  });

  it('clamps the result to ±LEAN_MAX_DEG', () => {
    const allMax = Array.from({ length: 12 }, () => 1);
    expect(leanFromOffsets(allMax)).toBeLessThanOrEqual(LEAN_MAX_DEG);
    const allMin = Array.from({ length: 12 }, () => -1);
    expect(leanFromOffsets(allMin)).toBeGreaterThanOrEqual(-LEAN_MAX_DEG);
  });
});
