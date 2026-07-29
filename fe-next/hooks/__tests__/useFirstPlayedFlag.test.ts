import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFirstPlayedFlag,
  hasPlayedMode,
  markPlayedMode,
  resetAllFirstPlayedFlags,
  FIRST_PLAYED_LS_KEY,
  type FirstPlayedMode,
} from '../useFirstPlayedFlag';

describe('useFirstPlayedFlag (localStorage gate for per-mode tutorials)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
    resetAllFirstPlayedFlags();
  });

  describe('hasPlayedMode / markPlayedMode (pure helpers)', () => {
    it('returns false for unseen mode', () => {
      expect(hasPlayedMode('wordWheel')).toBe(false);
    });

    it('returns true after markPlayedMode', () => {
      markPlayedMode('wordWheel');
      expect(hasPlayedMode('wordWheel')).toBe(true);
    });

    it('marks each mode independently', () => {
      markPlayedMode('wordHunt');
      expect(hasPlayedMode('wordHunt')).toBe(true);
      expect(hasPlayedMode('wordWheel')).toBe(false);
      expect(hasPlayedMode('boggle')).toBe(false);
    });

    it('persists to localStorage under FIRST_PLAYED_LS_KEY', () => {
      markPlayedMode('connections');
      const raw = window.localStorage.getItem(FIRST_PLAYED_LS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '{}');
      expect(parsed.connections).toBe(true);
    });

    it('reads back from localStorage on cold start', () => {
      window.localStorage.setItem(
        FIRST_PLAYED_LS_KEY,
        JSON.stringify({ blast: true })
      );
      expect(hasPlayedMode('blast')).toBe(true);
      expect(hasPlayedMode('wordWheel')).toBe(false);
    });

    it('resetAllFirstPlayedFlags clears every mode', () => {
      markPlayedMode('wordWheel');
      markPlayedMode('wordHunt');
      resetAllFirstPlayedFlags();
      expect(hasPlayedMode('wordWheel')).toBe(false);
      expect(hasPlayedMode('wordHunt')).toBe(false);
    });

    it('survives malformed localStorage gracefully', () => {
      window.localStorage.setItem(FIRST_PLAYED_LS_KEY, 'not-json{');
      expect(() => hasPlayedMode('wordWheel')).not.toThrow();
      expect(hasPlayedMode('wordWheel')).toBe(false);
    });
  });

  describe('useFirstPlayedFlag (hook)', () => {
    it('returns shouldShowTutorial=true when never played', () => {
      const { result } = renderHook(() => useFirstPlayedFlag('wordWheel'));
      expect(result.current.shouldShowTutorial).toBe(true);
      expect(result.current.hasPlayed).toBe(false);
    });

    it('returns shouldShowTutorial=false after markPlayed', () => {
      const { result } = renderHook(() => useFirstPlayedFlag('wordHunt'));
      expect(result.current.shouldShowTutorial).toBe(true);

      act(() => result.current.markPlayed());

      expect(result.current.hasPlayed).toBe(true);
      expect(result.current.shouldShowTutorial).toBe(false);
    });

    it('two consumers of the same mode see the same state after one marks', () => {
      const { result: a } = renderHook(() => useFirstPlayedFlag('blast'));
      const { result: b } = renderHook(() => useFirstPlayedFlag('blast'));

      expect(a.current.hasPlayed).toBe(false);
      expect(b.current.hasPlayed).toBe(false);

      act(() => a.current.markPlayed());

      expect(a.current.hasPlayed).toBe(true);
      expect(b.current.hasPlayed).toBe(true);
    });

    it('different modes do not affect each other', () => {
      const { result: wheel } = renderHook(() => useFirstPlayedFlag('wordWheel'));
      const { result: hunt } = renderHook(() => useFirstPlayedFlag('wordHunt'));

      act(() => wheel.current.markPlayed());

      expect(wheel.current.hasPlayed).toBe(true);
      expect(hunt.current.hasPlayed).toBe(false);
    });
  });

  describe('mode coverage', () => {
    it('supports all 6 enumerated modes', () => {
      const modes: FirstPlayedMode[] = [
        'wordWheel',
        'wordHunt',
        'boggle',
        'connections',
        'blast',
        'wheelRushMp',
      ];
      modes.forEach((m) => {
        expect(hasPlayedMode(m)).toBe(false);
        markPlayedMode(m);
        expect(hasPlayedMode(m)).toBe(true);
      });
    });
  });
});
