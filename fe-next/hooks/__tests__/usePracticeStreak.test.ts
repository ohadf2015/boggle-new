import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePracticeStreak,
  recordPracticeSession,
  getPracticeStreak,
  resetPracticeStreak,
  PRACTICE_STREAK_LS_KEY,
} from '../usePracticeStreak';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function setNow(iso: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe('usePracticeStreak (break-proof streak counter)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') window.localStorage.clear();
    resetPracticeStreak();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('helpers', () => {
    it('starts at zero with no recorded sessions', () => {
      expect(getPracticeStreak().current).toBe(0);
      expect(getPracticeStreak().longest).toBe(0);
    });

    it('records day 1 → current=1, longest=1', () => {
      setNow('2026-05-03T10:00:00Z');
      recordPracticeSession();
      const s = getPracticeStreak();
      expect(s.current).toBe(1);
      expect(s.longest).toBe(1);
    });

    it('two sessions same UTC day count as one', () => {
      setNow('2026-05-03T08:00:00Z');
      recordPracticeSession();
      setNow('2026-05-03T22:00:00Z');
      recordPracticeSession();
      expect(getPracticeStreak().current).toBe(1);
    });

    it('next consecutive day → current=2', () => {
      setNow('2026-05-03T10:00:00Z');
      recordPracticeSession();
      setNow('2026-05-04T10:00:00Z');
      recordPracticeSession();
      expect(getPracticeStreak().current).toBe(2);
      expect(getPracticeStreak().longest).toBe(2);
    });

    it('break-proof: skipping a day does NOT reset current (key spec rule)', () => {
      setNow('2026-05-03T10:00:00Z');
      recordPracticeSession();
      setNow('2026-05-04T10:00:00Z');
      recordPracticeSession(); // current=2
      // Skip 05-05 entirely
      setNow('2026-05-06T10:00:00Z');
      recordPracticeSession();
      expect(getPracticeStreak().current).toBe(3);
      expect(getPracticeStreak().longest).toBe(3);
    });

    it('persists to localStorage', () => {
      setNow('2026-05-03T10:00:00Z');
      recordPracticeSession();
      const raw = window.localStorage.getItem(PRACTICE_STREAK_LS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '{}');
      expect(parsed.current).toBe(1);
      expect(parsed.longest).toBe(1);
      expect(typeof parsed.lastDayKey).toBe('string');
    });

    it('survives malformed JSON', () => {
      window.localStorage.setItem(PRACTICE_STREAK_LS_KEY, '{not-json');
      expect(() => getPracticeStreak()).not.toThrow();
      expect(getPracticeStreak().current).toBe(0);
    });

    it('longest never decreases', () => {
      setNow('2026-05-03T10:00:00Z');
      for (let i = 0; i < 5; i++) {
        setNow(new Date(Date.parse('2026-05-03T10:00:00Z') + i * ONE_DAY_MS).toISOString());
        recordPracticeSession();
      }
      expect(getPracticeStreak().longest).toBe(5);
      // Reset just current via brand-new gap (would still increment, not reset)
      setNow('2026-06-01T10:00:00Z');
      recordPracticeSession();
      expect(getPracticeStreak().longest).toBe(6);
    });
  });

  describe('hook', () => {
    it('initial state is zero', () => {
      const { result } = renderHook(() => usePracticeStreak());
      expect(result.current.current).toBe(0);
      expect(result.current.longest).toBe(0);
    });

    it('record() updates current synchronously', () => {
      setNow('2026-05-03T10:00:00Z');
      const { result } = renderHook(() => usePracticeStreak());

      act(() => result.current.record());

      expect(result.current.current).toBe(1);
    });
  });
});
