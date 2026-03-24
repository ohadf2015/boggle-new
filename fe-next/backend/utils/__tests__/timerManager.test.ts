import timerManager, { TimerManager, setGameTimer, clearGameTimer } from '../timerManager';

beforeEach(() => {
  jest.useFakeTimers();
  timerManager.clearAll();
});

afterEach(() => {
  timerManager.clearAll();
  jest.useRealTimers();
});

// ==========================================
// setInterval
// ==========================================

describe('setInterval', () => {
  it('fires callback at correct intervals', () => {
    const cb = jest.fn();
    timerManager.setInterval('tick', cb, 1000);

    jest.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('returns the key', () => {
    const key = timerManager.setInterval('k', jest.fn(), 100);
    expect(key).toBe('k');
  });

  it('registers timer in map', () => {
    timerManager.setInterval('x', jest.fn(), 100);
    expect(timerManager.hasTimer('x')).toBe(true);
    expect(timerManager.getTimerCount()).toBe(1);
  });

  it('replaces existing timer with same key', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    timerManager.setInterval('dup', cb1, 1000);
    timerManager.setInterval('dup', cb2, 1000);

    jest.advanceTimersByTime(1000);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(timerManager.getTimerCount()).toBe(1);
  });
});

// ==========================================
// setTimeout
// ==========================================

describe('setTimeout', () => {
  it('fires callback after delay', () => {
    const cb = jest.fn();
    timerManager.setTimeout('delay', cb, 500);

    jest.advanceTimersByTime(499);
    expect(cb).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires only once', () => {
    const cb = jest.fn();
    timerManager.setTimeout('once', cb, 100);

    jest.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns the key', () => {
    expect(timerManager.setTimeout('t', jest.fn(), 100)).toBe('t');
  });

  it('replaces existing timeout with same key', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    timerManager.setTimeout('dup', cb1, 500);
    timerManager.setTimeout('dup', cb2, 500);

    jest.advanceTimersByTime(500);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// ==========================================
// clearTimer
// ==========================================

describe('clearTimer', () => {
  it('stops an interval', () => {
    const cb = jest.fn();
    timerManager.setInterval('i', cb, 100);
    timerManager.clearTimer('i');

    jest.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
    expect(timerManager.hasTimer('i')).toBe(false);
  });

  it('stops a timeout', () => {
    const cb = jest.fn();
    timerManager.setTimeout('t', cb, 100);
    timerManager.clearTimer('t');

    jest.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('returns true when timer existed', () => {
    timerManager.setTimeout('x', jest.fn(), 100);
    expect(timerManager.clearTimer('x')).toBe(true);
  });

  it('returns false for non-existent timer', () => {
    expect(timerManager.clearTimer('nope')).toBe(false);
  });

  it('double clear returns false on second call', () => {
    timerManager.setTimeout('x', jest.fn(), 100);
    expect(timerManager.clearTimer('x')).toBe(true);
    expect(timerManager.clearTimer('x')).toBe(false);
  });
});

// ==========================================
// clearTimersWithPrefix
// ==========================================

describe('clearTimersWithPrefix', () => {
  it('clears only timers matching prefix', () => {
    const cbA = jest.fn();
    const cbB = jest.fn();
    timerManager.setInterval('room:1:tick', cbA, 100);
    timerManager.setTimeout('room:1:end', jest.fn(), 5000);
    timerManager.setInterval('room:2:tick', cbB, 100);

    const cleared = timerManager.clearTimersWithPrefix('room:1:');
    expect(cleared).toBe(2);
    expect(timerManager.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(100);
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).toHaveBeenCalled();
  });

  it('returns 0 when no match', () => {
    expect(timerManager.clearTimersWithPrefix('nope')).toBe(0);
  });
});

// ==========================================
// clearAll
// ==========================================

describe('clearAll', () => {
  it('removes all timers and returns count', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    timerManager.setInterval('a', cb1, 100);
    timerManager.setTimeout('b', cb2, 100);

    const count = timerManager.clearAll();
    expect(count).toBe(2);
    expect(timerManager.getTimerCount()).toBe(0);

    jest.advanceTimersByTime(1000);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it('returns 0 when empty', () => {
    expect(timerManager.clearAll()).toBe(0);
  });
});

// ==========================================
// Multiple independent timers
// ==========================================

describe('multiple timers', () => {
  it('run independently', () => {
    const fast = jest.fn();
    const slow = jest.fn();
    timerManager.setInterval('fast', fast, 100);
    timerManager.setInterval('slow', slow, 500);

    jest.advanceTimersByTime(500);
    expect(fast).toHaveBeenCalledTimes(5);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it('clearing one does not affect others', () => {
    const a = jest.fn();
    const b = jest.fn();
    timerManager.setInterval('a', a, 100);
    timerManager.setInterval('b', b, 100);

    timerManager.clearTimer('a');
    jest.advanceTimersByTime(100);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});

// ==========================================
// Query methods
// ==========================================

describe('getTimerKeys', () => {
  it('returns all keys when no prefix', () => {
    timerManager.setTimeout('a', jest.fn(), 100);
    timerManager.setTimeout('b', jest.fn(), 100);
    expect(timerManager.getTimerKeys()).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('filters by prefix', () => {
    timerManager.setTimeout('game:1', jest.fn(), 100);
    timerManager.setTimeout('game:2', jest.fn(), 100);
    timerManager.setTimeout('room:1', jest.fn(), 100);
    expect(timerManager.getTimerKeys('game:')).toEqual(['game:1', 'game:2']);
  });
});

// ==========================================
// Convenience functions: setGameTimer / clearGameTimer
// ==========================================

describe('setGameTimer (convenience)', () => {
  it('registers interval under game: prefix via deprecated _timers', () => {
    const id = setInterval(jest.fn(), 1000) as any;
    setGameTimer('ABC', id);

    expect(timerManager.hasTimer('game:ABC')).toBe(true);
  });

  it('clearGameTimer clears it', () => {
    const cb = jest.fn();
    const id = setInterval(cb, 100) as any;
    setGameTimer('X', id);

    expect(clearGameTimer('X')).toBe(true);
    expect(timerManager.hasTimer('game:X')).toBe(false);
  });

  it('clearGameTimer returns false when not found', () => {
    expect(clearGameTimer('missing')).toBe(false);
  });
});

// ==========================================
// Deprecated _timers access pattern
// ==========================================

describe('deprecated _timers getter', () => {
  it('exposes internal Map directly (legacy pattern)', () => {
    // DOCUMENTED: setGameTimer bypasses class methods and writes directly
    // to the internal Map via the _timers getter. This means the interval
    // is NOT auto-cleared on key collision like setInterval/setTimeout do.
    const map = timerManager._timers;
    expect(map).toBeInstanceOf(Map);
    expect(map).toBe(timerManager._timers); // same reference
  });

  it('setGameTimer clears previous timer before registering new one (leak fixed)', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const id1 = setInterval(cb1, 100) as any;
    const id2 = setInterval(cb2, 100) as any;

    // First call through convenience function
    setGameTimer('RACE', id1);
    // Second call now clears id1 before registering id2
    setGameTimer('RACE', id2);

    jest.advanceTimersByTime(100);
    // Only cb2 fires — cb1 was properly cleared to prevent leaks
    expect(cb1).toHaveBeenCalledTimes(0);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// ==========================================
// TimerManager constructor (fresh instance)
// ==========================================

describe('TimerManager class', () => {
  it('can create independent instances', () => {
    const mgr = new TimerManager();
    mgr.setTimeout('x', jest.fn(), 100);
    expect(mgr.getTimerCount()).toBe(1);
    expect(timerManager.getTimerCount()).toBe(0);
    mgr.clearAll();
  });
});
