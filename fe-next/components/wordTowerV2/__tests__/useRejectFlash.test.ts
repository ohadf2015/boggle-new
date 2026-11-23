// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const announceWordResult = vi.fn();
vi.mock('@/components/GameAnnouncer', () => ({ useAnnouncer: () => ({ announceWordResult }) }));
vi.mock('@/utils/haptics', () => ({ hapticError: vi.fn(), hapticForWordScore: vi.fn() }));

import { useRejectFlash } from '../useWordWheel';
import { VERDICT_MS, VERDICT_REPEAT_MS } from '@/lib/wordVerdict/wordVerdict';

const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('Word Tower reject flash', () => {
  beforeEach(() => { vi.useFakeTimers(); announceWordResult.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('given a non-word, it shows the shared verdict, buzzes and announces it for the shared hold time', () => {
    const playSound = vi.fn();
    const { result } = renderHook(() => useRejectFlash(playSound, t));
    act(() => { result.current.flash('not_in_dictionary', 'ANUAL'); });
    expect(result.current.rejected).toBe('wordVerdict.notAWord');
    expect(playSound).toHaveBeenCalledWith('wordRejected');
    expect(announceWordResult).toHaveBeenCalledWith('ANUAL', false, undefined, 'wordVerdict.notAWord');
    act(() => { vi.advanceTimersByTime(VERDICT_MS - 1); });
    expect(result.current.rejected).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.rejected).toBeNull();
  });

  it('given the same non-word again (the hammered BUILD), it says why more plainly and holds longer', () => {
    const { result } = renderHook(() => useRejectFlash(vi.fn(), t));
    act(() => { result.current.flash('not_in_dictionary', 'ANUAL'); });
    act(() => { result.current.flash('not_in_dictionary', 'ANUAL'); });
    expect(result.current.rejected).toBe('wordVerdict.notAWordAgain');
    act(() => { vi.advanceTimersByTime(VERDICT_MS + 10); });
    expect(result.current.rejected).toBe('wordVerdict.notAWordAgain');
    act(() => { vi.advanceTimersByTime(VERDICT_REPEAT_MS); });
    expect(result.current.rejected).toBeNull();
  });

  it('names the minimum length for a short word', () => {
    const { result } = renderHook(() => useRejectFlash(vi.fn(), t));
    act(() => { result.current.flash('too_short', 'AN'); });
    expect(result.current.rejected).toBe('wordVerdict.tooShort{"min":3}');
  });

  it('keeps a mode-only key (rescue word too short) as its own message', () => {
    const { result } = renderHook(() => useRejectFlash(vi.fn(), t));
    act(() => { result.current.flash('wordTowerV2.brace.short', ''); });
    expect(result.current.rejected).toBe('wordTowerV2.brace.short');
  });
});
