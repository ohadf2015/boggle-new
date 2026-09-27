/**
 * Tests for useWordValidation hook
 *
 * The dictionary-help voting modal must:
 * 1. Only ask the player about ONE word (not cycle through several).
 * 2. Auto-show only after the player has interacted with the page for 7s.
 * 3. Show at most once per browser session.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordValidation } from '../useWordValidation';

const baseParams = {
  botWordsForValidation: ['toe', 'rate', 'cone'],
  gameSessionId: 'sess-1',
  language: 'es',
};

describe('useWordValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('limits the validation queue to a single word', () => {
    const { result } = renderHook(() => useWordValidation(baseParams));
    expect(result.current.wordValidationQueue).toEqual(['toe']);
  });

  it('does not auto-show before 7s even after interaction', () => {
    const { result } = renderHook(() => useWordValidation(baseParams));

    act(() => {
      vi.advanceTimersByTime(5000);
      window.dispatchEvent(new MouseEvent('click'));
    });

    expect(result.current.showWordValidation).toBe(false);
  });

  it('auto-shows after 7s of interaction', () => {
    const { result } = renderHook(() => useWordValidation(baseParams));

    act(() => {
      vi.advanceTimersByTime(7000);
      window.dispatchEvent(new MouseEvent('click'));
    });

    expect(result.current.showWordValidation).toBe(true);
  });

  it('shows at most once per session (does not re-show on a fresh results screen)', () => {
    const first = renderHook(() => useWordValidation(baseParams));
    act(() => {
      vi.advanceTimersByTime(7000);
      window.dispatchEvent(new MouseEvent('click'));
    });
    expect(first.result.current.showWordValidation).toBe(true);
    first.unmount();

    // A new game -> a new results screen mounts the hook again in the same session.
    const second = renderHook(() => useWordValidation(baseParams));
    act(() => {
      vi.advanceTimersByTime(7000);
      window.dispatchEvent(new MouseEvent('click'));
    });
    expect(second.result.current.showWordValidation).toBe(false);
  });
});
