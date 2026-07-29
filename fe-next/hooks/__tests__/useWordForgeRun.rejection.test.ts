import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordForgeRun } from '../useWordForgeRun';

// Hook loads progress on mount; stub it so nothing hits the network.
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: false }),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useWordForgeRun rejection feedback', () => {
  it('exposes no rejection before play', () => {
    const { result } = renderHook(() => useWordForgeRun('en'));
    expect(result.current.lastRejection).toBeNull();
  });

  it('flags a duplicate word with a reason instead of silently dropping it', () => {
    const { result } = renderHook(() => useWordForgeRun('en'));
    act(() => result.current.startRun());
    act(() => result.current.submitWord('CAT'));
    expect(result.current.state.wordsThisRound).toContain('CAT');
    expect(result.current.lastRejection).toBeNull(); // first one accepted

    act(() => result.current.submitWord('CAT'));
    expect(result.current.lastRejection).not.toBeNull();
    expect(result.current.lastRejection?.reason).toBe('duplicate');
    expect(result.current.lastRejection?.word).toBe('CAT');
  });

  it('bumps the nonce so repeated identical rejections re-fire', () => {
    const { result } = renderHook(() => useWordForgeRun('en'));
    act(() => result.current.startRun());
    act(() => result.current.submitWord('CAT'));
    act(() => result.current.submitWord('CAT'));
    const firstNonce = result.current.lastRejection?.nonce;
    act(() => result.current.submitWord('CAT'));
    expect(result.current.lastRejection?.nonce).toBeGreaterThan(firstNonce ?? 0);
  });
});
