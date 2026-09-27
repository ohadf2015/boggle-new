/**
 * useModeFirstSeen — localStorage gate for cozy first-time mode intro.
 *
 * Returns [hasSeen, markSeen]. Bumped via VERSION when intro copy/demo changes
 * so returning players see updated intro after a meaningful redesign.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useModeFirstSeen, MODE_INTRO_VERSION } from '../useModeFirstSeen';

describe('useModeFirstSeen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns hasSeen=false on first visit', () => {
    const { result } = renderHook(() => useModeFirstSeen('classic'));
    expect(result.current.hasSeen).toBe(false);
  });

  it('returns hasSeen=true after markSeen()', () => {
    const { result, rerender } = renderHook(() => useModeFirstSeen('blast'));
    act(() => {
      result.current.markSeen();
    });
    rerender();
    expect(result.current.hasSeen).toBe(true);
  });

  it('persists across renders for same mode', () => {
    const first = renderHook(() => useModeFirstSeen('wordHunt'));
    act(() => {
      first.result.current.markSeen();
    });
    const second = renderHook(() => useModeFirstSeen('wordHunt'));
    expect(second.result.current.hasSeen).toBe(true);
  });

  it('tracks each mode independently', () => {
    const blast = renderHook(() => useModeFirstSeen('blast'));
    act(() => {
      blast.result.current.markSeen();
    });
    const wheel = renderHook(() => useModeFirstSeen('wheelRush'));
    expect(wheel.result.current.hasSeen).toBe(false);
  });

  it('resets when MODE_INTRO_VERSION bumps (stale localStorage)', () => {
    localStorage.setItem('lc_seen_mode_classic', '0');
    const { result } = renderHook(() => useModeFirstSeen('classic'));
    expect(result.current.hasSeen).toBe(false);
  });

  it('honors current version', () => {
    localStorage.setItem('lc_seen_mode_classic', String(MODE_INTRO_VERSION));
    const { result } = renderHook(() => useModeFirstSeen('classic'));
    expect(result.current.hasSeen).toBe(true);
  });
});
