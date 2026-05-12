/**
 * useBlastComboStreak - Tests for combo streak hook.
 * TDD: written before implementation (RED phase).
 *
 * Given-When-Then pattern throughout.
 * Timer strategy: vi.useFakeTimers() with advanceTimersByTime().
 * RAF is mocked globally as setTimeout(cb, 0) in jest.setup.js.
 */
import { renderHook, act } from '@testing-library/react';
import { useBlastComboStreak } from '../hooks/useBlastComboStreak';

// ==================== Constants (mirror implementation) ====================

const COMBO_WINDOW_MS = 3000;
const COMBO_MULTIPLIER_PER_LEVEL = 0.20;

// ==================== Helpers ====================

/** Advance both real timers and RAF callbacks by ms */
function advance(ms: number) {
  vi.advanceTimersByTime(ms);
}

// ==================== Tests ====================

describe('useBlastComboStreak — initial state', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts with an inactive streak at level 0', () => {
    // Given a freshly mounted hook
    const { result } = renderHook(() => useBlastComboStreak());

    // Then streak is inactive with zeroed values
    expect(result.current.streak.level).toBe(0);
    expect(result.current.streak.isActive).toBe(false);
    expect(result.current.streak.multiplier).toBe(1);
  });
});

describe('useBlastComboStreak — first word submitted', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts streak at level 1 when first word is submitted', () => {
    // Given a hook with no prior activity
    const { result } = renderHook(() => useBlastComboStreak());

    // When the first word is submitted
    act(() => {
      result.current.onWordSubmitted();
    });

    // Then streak is active at level 1
    expect(result.current.streak.level).toBe(1);
    expect(result.current.streak.isActive).toBe(true);
  });

  it('calculates multiplier as 1 + level * 0.20 for level 1 (1.20)', () => {
    // Given a hook
    const { result } = renderHook(() => useBlastComboStreak());

    // When first word submitted
    act(() => {
      result.current.onWordSubmitted();
    });

    // Then multiplier is 1.25
    expect(result.current.streak.multiplier).toBeCloseTo(1 + 1 * COMBO_MULTIPLIER_PER_LEVEL);
  });
});

describe('useBlastComboStreak — streak increments', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('increments level to 2 when second word submitted within window', () => {
    // Given a streak already started
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => { result.current.onWordSubmitted(); });

    // When second word submitted before window expires
    act(() => {
      advance(1000); // 1s elapsed — still within 3s window
      result.current.onWordSubmitted();
    });

    // Then streak is at level 2
    expect(result.current.streak.level).toBe(2);
  });

  it('multiplier for level 2 is 1.4', () => {
    // Given two words submitted quickly
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => { result.current.onWordSubmitted(); });
    act(() => { result.current.onWordSubmitted(); });

    // Then multiplier = 1 + 2 * 0.20 = 1.4
    expect(result.current.streak.multiplier).toBeCloseTo(1.4);
  });

  it('builds combo correctly through rapid word submissions', () => {
    // Given a hook
    const { result } = renderHook(() => useBlastComboStreak());

    // When 5 words submitted rapidly
    act(() => {
      result.current.onWordSubmitted(); // level 1
      result.current.onWordSubmitted(); // level 2
      result.current.onWordSubmitted(); // level 3
      result.current.onWordSubmitted(); // level 4
      result.current.onWordSubmitted(); // level 5
    });

    // Then level is 5
    expect(result.current.streak.level).toBe(5);
    expect(result.current.streak.multiplier).toBeCloseTo(2.0); // 1 + 5*0.20
  });
});

describe('useBlastComboStreak — window expiry decays by 1', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('decays level by 1 (not reset to 0) when window expires at level 2', () => {
    // Given a streak at level 2
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      result.current.onWordSubmitted();
      result.current.onWordSubmitted();
    });
    expect(result.current.streak.level).toBe(2);

    // When window expires
    act(() => {
      advance(COMBO_WINDOW_MS + 50);
    });

    // Then level decays by 1 to level 1 (still active)
    expect(result.current.streak.level).toBe(1);
    expect(result.current.streak.isActive).toBe(true);
  });

  it('streak becomes inactive when level reaches 0 after decay', () => {
    // Given a streak at level 1
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      result.current.onWordSubmitted();
    });
    expect(result.current.streak.level).toBe(1);

    // When window expires
    act(() => {
      advance(COMBO_WINDOW_MS + 50);
    });

    // Then level decays to 0 and streak is inactive
    expect(result.current.streak.level).toBe(0);
    expect(result.current.streak.isActive).toBe(false);
  });

  it('continues decaying over multiple window expirations', () => {
    // Given a streak at level 3
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      result.current.onWordSubmitted(); // level 1
      result.current.onWordSubmitted(); // level 2
      result.current.onWordSubmitted(); // level 3
    });

    // When first window expires → level 2
    act(() => { advance(COMBO_WINDOW_MS + 50); });
    expect(result.current.streak.level).toBe(2);

    // When second window expires → level 1
    act(() => { advance(COMBO_WINDOW_MS + 50); });
    expect(result.current.streak.level).toBe(1);

    // When third window expires → level 0, inactive
    act(() => { advance(COMBO_WINDOW_MS + 50); });
    expect(result.current.streak.level).toBe(0);
    expect(result.current.streak.isActive).toBe(false);
  });
});

describe('useBlastComboStreak — max combo level cap', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('caps combo level at MAX_COMBO_LEVEL (10)', () => {
    // Given a hook
    const { result } = renderHook(() => useBlastComboStreak());

    // When 15 words submitted rapidly (more than MAX)
    act(() => {
      for (let i = 0; i < 15; i++) {
        result.current.onWordSubmitted();
      }
    });

    // Then level is capped at 10
    expect(result.current.streak.level).toBe(10);
  });

  it('multiplier is capped at 1 + 10 * 0.20 = 3.0 at max level', () => {
    // Given max combo reached
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.onWordSubmitted();
      }
    });

    // Then multiplier does not exceed 3.0
    expect(result.current.streak.multiplier).toBeCloseTo(3.0);
  });
});

describe('useBlastComboStreak — reset()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('reset() clears level to 0', () => {
    // Given an active streak
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      result.current.onWordSubmitted();
      result.current.onWordSubmitted();
      result.current.onWordSubmitted();
    });
    expect(result.current.streak.level).toBe(3);

    // When reset is called
    act(() => {
      result.current.reset();
    });

    // Then level is 0
    expect(result.current.streak.level).toBe(0);
  });

  it('reset() sets isActive to false', () => {
    // Given an active streak
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => { result.current.onWordSubmitted(); });

    // When reset
    act(() => { result.current.reset(); });

    // Then inactive
    expect(result.current.streak.isActive).toBe(false);
  });

  it('reset() sets multiplier back to 1', () => {
    // Given an active streak at level 5
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      for (let i = 0; i < 5; i++) result.current.onWordSubmitted();
    });

    // When reset
    act(() => { result.current.reset(); });

    // Then multiplier is 1 (no bonus)
    expect(result.current.streak.multiplier).toBe(1);
  });

  it('new words after reset() restart streak from level 1', () => {
    // Given a streak that was reset
    const { result } = renderHook(() => useBlastComboStreak());
    act(() => {
      result.current.onWordSubmitted();
      result.current.onWordSubmitted();
      result.current.reset();
    });

    // When a new word is submitted
    act(() => { result.current.onWordSubmitted(); });

    // Then streak restarts at level 1
    expect(result.current.streak.level).toBe(1);
  });
});

describe('useBlastComboStreak — cleanup on unmount', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('cleans up RAF/timers on unmount without throwing', () => {
    // Given an active streak
    const { result, unmount } = renderHook(() => useBlastComboStreak());
    act(() => { result.current.onWordSubmitted(); });

    // When unmounted while timer is running
    // Then no errors thrown
    expect(() => unmount()).not.toThrow();
  });
});
