import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  emitCoinEarned,
  emitCoinSpent,
  selectCoinFxMode,
  findCoinCounter,
  markCoinsInFlight,
  msUntilCoinsLand,
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

describe('emitCoinEarned inline', () => {
  it('marks an inline earn so the target counter rolls itself (no floating HUD)', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_EARNED_EVENT, handler);
    emitCoinEarned(4, { x: 1, y: 2 }, { inline: true });
    window.removeEventListener(COIN_EARNED_EVENT, handler);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ amount: 4, source: { x: 1, y: 2 }, inline: true });
  });
});

describe('selectCoinFxMode', () => {
  it('reduced motion -> none (sound only)', () => {
    expect(selectCoinFxMode({ reduced: true })).toBe('none');
  });
  it('otherwise -> dom flight, on web and native alike', () => {
    expect(selectCoinFxMode({ reduced: false })).toBe('dom');
  });
});

describe('findCoinCounter', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function counter(rect: { left: number; top: number; width: number; height: number }) {
    const el = document.createElement('div');
    el.setAttribute('data-coin-counter', 'true');
    el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(el);
    return el;
  }

  it('skips a hidden counter and returns the one on screen', () => {
    counter({ left: 0, top: 0, width: 0, height: 0 });
    const visible = counter({ left: 300, top: 20, width: 60, height: 30 });
    expect(findCoinCounter()).toBe(visible);
  });

  it('returns null when no counter is on screen', () => {
    counter({ left: 0, top: 0, width: 0, height: 0 });
    expect(findCoinCounter()).toBeNull();
  });
});

describe('coin flight clock', () => {
  afterEach(() => vi.useRealTimers());

  it('tells a counter how long until coins in flight land, and 0 once they have', () => {
    vi.useFakeTimers({ toFake: ['performance', 'Date'] });
    expect(msUntilCoinsLand()).toBe(0);
    markCoinsInFlight(600);
    expect(msUntilCoinsLand()).toBe(600);
    vi.advanceTimersByTime(450);
    expect(msUntilCoinsLand()).toBe(150);
    vi.advanceTimersByTime(200);
    expect(msUntilCoinsLand()).toBe(0);
  });
});

describe('emitCoinEarned coins override', () => {
  it('carries an explicit flying-coin count', () => {
    const handler = vi.fn();
    window.addEventListener(COIN_EARNED_EVENT, handler);
    emitCoinEarned(3, { x: 1, y: 2 }, { inline: true, coins: 7 });
    window.removeEventListener(COIN_EARNED_EVENT, handler);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.coins).toBe(7);
  });
});
