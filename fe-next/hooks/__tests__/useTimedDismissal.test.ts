import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimedDismissal, isDismissedWithin } from '@/hooks/useLocalStorageState';
import { useTeacherTrialEnded } from '@/hooks/useTeacherTrialEnded';
import { useTeacherTrialExpiring } from '@/hooks/useTeacherTrialExpiring';

const KEY = 'lexiclash.test_dismissed';
const DAY = 24 * 60 * 60 * 1000;
const NOW = 10 * DAY;

describe('useTimedDismissal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('given nothing stored, when mounted, then the banner may show', () => {
    const { result } = renderHook(() => useTimedDismissal(KEY, DAY));
    expect(result.current.dismissed).toBe(false);
  });

  it('given a dismissal written by the old hooks inside the window, when mounted, then it stays dismissed', () => {
    localStorage.setItem(KEY, String(NOW - DAY + 1));
    const { result } = renderHook(() => useTimedDismissal(KEY, DAY));
    expect(result.current.dismissed).toBe(true);
  });

  it('given the window has passed or the value is junk, when mounted, then the banner comes back', () => {
    localStorage.setItem(KEY, String(NOW - DAY));
    expect(renderHook(() => useTimedDismissal(KEY, DAY)).result.current.dismissed).toBe(false);
    localStorage.setItem(KEY, 'true');
    expect(renderHook(() => useTimedDismissal(KEY, DAY)).result.current.dismissed).toBe(false);
  });

  it('given a tap on dismiss, then it hides at once and stores the time under the same key', () => {
    const { result } = renderHook(() => useTimedDismissal(KEY, DAY));
    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(String(NOW));
  });

  it('starts hidden before storage is read, so a reload never flashes a banner the teacher dismissed', () => {
    expect(isDismissedWithin(null, KEY, DAY, NOW)).toBe(false);
    const seen: boolean[] = [];
    localStorage.setItem(KEY, String(NOW));
    renderHook(() => {
      const r = useTimedDismissal(KEY, DAY);
      seen.push(r.dismissed);
      return r;
    });
    expect(seen.every(Boolean)).toBe(true);
  });

  it('keeps every trial banner on its existing key, so dismissals already in browsers still count', () => {
    localStorage.setItem('lexiclash.teacher_trial_ended_dismissed', String(NOW));
    localStorage.setItem('lexiclash.teacher_trial_expiring_dismissed', String(NOW));
    expect(renderHook(() => useTeacherTrialEnded()).result.current.dismissed).toBe(true);
    expect(renderHook(() => useTeacherTrialExpiring()).result.current.dismissed).toBe(true);
  });
});
