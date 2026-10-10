import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  emitCoinEarned,
  emitCoinSpent,
  selectCoinFxMode,
  COIN_EARNED_EVENT,
  COIN_SPENT_EVENT,
} from '../coinEarnedFx';

describe('emitCoinEarned', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches a coin-earned event carrying the amount', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_EARNED_EVENT, handler);
    emitCoinEarned(75);
    window.removeEventListener(COIN_EARNED_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.amount).toBe(75);
  });

  it('includes the source position when provided', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_EARNED_EVENT, handler);
    emitCoinEarned(50, { x: 10, y: 20 });
    window.removeEventListener(COIN_EARNED_EVENT, handler);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.source).toEqual({ x: 10, y: 20 });
  });

  it('ignores non-positive amounts', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_EARNED_EVENT, handler);
    emitCoinEarned(0);
    emitCoinEarned(-5);
    window.removeEventListener(COIN_EARNED_EVENT, handler);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('emitCoinSpent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches a coin-spent event carrying the amount + source', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_SPENT_EVENT, handler);
    emitCoinSpent(120, { x: 5, y: 6 });
    window.removeEventListener(COIN_SPENT_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.amount).toBe(120);
    expect(detail.source).toEqual({ x: 5, y: 6 });
  });

  it('ignores non-positive amounts', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_SPENT_EVENT, handler);
    emitCoinSpent(0);
    emitCoinSpent(-9);
    window.removeEventListener(COIN_SPENT_EVENT, handler);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('selectCoinFxMode', () => {
  it('reduced motion -> none (sound only)', () => {
    expect(selectCoinFxMode({ reduced: true, fxActive: true })).toBe('none');
  });
  it('webgl FX active -> webgl', () => {
    expect(selectCoinFxMode({ reduced: false, fxActive: true })).toBe('webgl');
  });
  it('no WebGL FX -> dom burst, so coins still fly on web', () => {
    expect(selectCoinFxMode({ reduced: false, fxActive: false })).toBe('dom');
  });
});
