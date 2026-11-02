import { describe, it, expect, beforeEach, vi } from 'vitest';
import { markDailyHandoff, consumeDailyHandoff, chainPips, HANDOFF_TTL_MS } from '../dailyHandoff';

describe('daily chain handoff marker', () => {
  beforeEach(() => sessionStorage.clear());

  it('given a handoff to a mode, when that mode arrives, then it is consumed exactly once', () => {
    markDailyHandoff('word-hunt', 1000);
    expect(consumeDailyHandoff('word-hunt', 2000)).toBe(true);
    expect(consumeDailyHandoff('word-hunt', 2001)).toBe(false);
  });

  it('given a handoff to another mode, when a different mode arrives, then it is not a handoff and the marker is dropped', () => {
    markDailyHandoff('connections', 1000);
    expect(consumeDailyHandoff('word-hunt', 1500)).toBe(false);
    expect(consumeDailyHandoff('connections', 1600)).toBe(false);
  });

  it('given a stale marker, when the mode arrives later than the TTL, then it is a normal arrival', () => {
    markDailyHandoff('word-tower', 1000);
    expect(consumeDailyHandoff('word-tower', 1000 + HANDOFF_TTL_MS + 1)).toBe(false);
  });

  it('given storage that throws, then both calls fail closed without throwing', () => {
    const spy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => { throw new Error('off'); });
    const spy2 = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => { throw new Error('off'); });
    expect(() => markDailyHandoff('word-hunt')).not.toThrow();
    expect(consumeDailyHandoff('word-hunt')).toBe(false);
    spy.mockRestore();
    spy2.mockRestore();
  });

  it('given a garbage marker, then it is ignored', () => {
    sessionStorage.setItem('lc:daily-handoff', '{nope');
    expect(consumeDailyHandoff('word-hunt')).toBe(false);
  });
});

describe('chainPips', () => {
  it('without play state, marks earlier steps done, this one active, later ones next', () => {
    expect(chainPips('connections')).toEqual(['done', 'done', 'active', 'next']);
  });

  it('with play state, uses it for every step but the active one', () => {
    const played = (id: string) => id === 'word-wheel';
    expect(chainPips('connections', played)).toEqual(['done', 'next', 'active', 'next']);
  });
});
