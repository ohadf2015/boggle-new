// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { usePendingWords, SETTLED_CHIP_MS } from '../usePendingWords';

describe('usePendingWords', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => usePendingWords());
    expect(result.current.pendingWords.size).toBe(0);
  });

  it('adds a word as pending on enqueue', () => {
    const { result } = renderHook(() => usePendingWords());
    act(() => { result.current.enqueuePending('STAR'); });
    expect(result.current.pendingWords.get('STAR')).toBe('pending');
  });

  it('confirms a pending word to "confirmed" on ack', () => {
    const { result } = renderHook(() => usePendingWords());
    act(() => { result.current.enqueuePending('CAT'); });
    act(() => { result.current.confirmPending('CAT'); });
    expect(result.current.pendingWords.get('CAT')).toBe('confirmed');
  });

  it('marks a pending word as "rejected" on reject', () => {
    const { result } = renderHook(() => usePendingWords());
    act(() => { result.current.enqueuePending('FOO'); });
    act(() => { result.current.rejectPending('FOO'); });
    expect(result.current.pendingWords.get('FOO')).toBe('rejected');
  });

  it('removes a word on dismiss', () => {
    const { result } = renderHook(() => usePendingWords());
    act(() => { result.current.enqueuePending('BAR'); });
    act(() => { result.current.dismissPending('BAR'); });
    expect(result.current.pendingWords.has('BAR')).toBe(false);
  });

  it('clearAll removes all entries', () => {
    const { result } = renderHook(() => usePendingWords());
    act(() => {
      result.current.enqueuePending('A');
      result.current.enqueuePending('B');
    });
    act(() => { result.current.clearAll(); });
    expect(result.current.pendingWords.size).toBe(0);
  });

  it('isPending returns true only for pending status', () => {
    const { result } = renderHook(() => usePendingWords());
    act(() => { result.current.enqueuePending('WORD'); });
    expect(result.current.isPending('WORD')).toBe(true);
    act(() => { result.current.confirmPending('WORD'); });
    expect(result.current.isPending('WORD')).toBe(false);
  });

  describe('settled chips leave on their own (a confirmed chip has no exit animation, and reduced motion drops the shake — they piled up over the board all round)', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('a confirmed word is removed after a short beat', () => {
      const { result } = renderHook(() => usePendingWords());
      act(() => { result.current.enqueuePending('CAT'); });
      act(() => { result.current.confirmPending('CAT'); });
      expect(result.current.pendingWords.get('CAT')).toBe('confirmed');
      act(() => { vi.advanceTimersByTime(SETTLED_CHIP_MS); });
      expect(result.current.pendingWords.has('CAT')).toBe(false);
    });

    it('a rejected word is removed after a short beat too', () => {
      const { result } = renderHook(() => usePendingWords());
      act(() => { result.current.enqueuePending('XQ'); });
      act(() => { result.current.rejectPending('XQ'); });
      act(() => { vi.advanceTimersByTime(SETTLED_CHIP_MS); });
      expect(result.current.pendingWords.has('XQ')).toBe(false);
    });

    it('a still-pending word is never auto-removed', () => {
      const { result } = renderHook(() => usePendingWords());
      act(() => { result.current.enqueuePending('DOG'); });
      act(() => { vi.advanceTimersByTime(SETTLED_CHIP_MS * 3); });
      expect(result.current.pendingWords.get('DOG')).toBe('pending');
    });

    it('re-submitting a word after it settled is not removed by the old timer', () => {
      const { result } = renderHook(() => usePendingWords());
      act(() => { result.current.enqueuePending('CAT'); });
      act(() => { result.current.confirmPending('CAT'); });
      act(() => { vi.advanceTimersByTime(SETTLED_CHIP_MS - 10); });
      act(() => { result.current.enqueuePending('CAT'); });
      act(() => { vi.advanceTimersByTime(20); });
      expect(result.current.pendingWords.get('CAT')).toBe('pending');
    });
  });
});
