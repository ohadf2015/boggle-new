/**
 * useRetryAssistFlow Tests
 *
 * After ≥2 consecutive defeats with 0 stars, show RetryAssistModal.
 * Provides three retry variants: with time bonus, with hint, plain.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetryAssistFlow } from '../useRetryAssistFlow';

describe('useRetryAssistFlow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const base = {
    handleRetry: vi.fn(),
    addTime: vi.fn(),
    getHint: vi.fn(),
    showLevelComplete: false,
    stars: 0,
    consecutiveFailures: 0,
  };

  it('shows modal when defeated with ≥2 consecutive failures', () => {
    const { result } = renderHook(() =>
      useRetryAssistFlow({ ...base, showLevelComplete: true, stars: 0, consecutiveFailures: 2 })
    );
    expect(result.current.showRetryAssist).toBe(true);
  });

  it('does not show when stars > 0 (level passed)', () => {
    const { result } = renderHook(() =>
      useRetryAssistFlow({ ...base, showLevelComplete: true, stars: 1, consecutiveFailures: 5 })
    );
    expect(result.current.showRetryAssist).toBe(false);
  });

  it('does not show when failures < 2', () => {
    const { result } = renderHook(() =>
      useRetryAssistFlow({ ...base, showLevelComplete: true, stars: 0, consecutiveFailures: 1 })
    );
    expect(result.current.showRetryAssist).toBe(false);
  });

  it('retry-with-bonus adds 15s then retries, closes modal', () => {
    const handleRetry = vi.fn();
    const addTime = vi.fn();
    const { result } = renderHook(() =>
      useRetryAssistFlow({
        ...base, handleRetry, addTime,
        showLevelComplete: true, stars: 0, consecutiveFailures: 2,
      })
    );
    act(() => result.current.handleRetryWithBonus());
    expect(addTime).toHaveBeenCalledWith(15);
    expect(handleRetry).toHaveBeenCalledTimes(1);
    expect(result.current.showRetryAssist).toBe(false);
  });

  it('retry-with-hint retries then triggers hint after 1500ms', () => {
    const handleRetry = vi.fn();
    const getHint = vi.fn();
    const { result } = renderHook(() =>
      useRetryAssistFlow({
        ...base, handleRetry, getHint,
        showLevelComplete: true, stars: 0, consecutiveFailures: 2,
      })
    );
    act(() => result.current.handleRetryWithHint());
    expect(handleRetry).toHaveBeenCalledTimes(1);
    expect(getHint).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(getHint).toHaveBeenCalledTimes(1);
  });

  it('plain retry-from-assist just closes modal and retries', () => {
    const handleRetry = vi.fn();
    const { result } = renderHook(() =>
      useRetryAssistFlow({
        ...base, handleRetry,
        showLevelComplete: true, stars: 0, consecutiveFailures: 2,
      })
    );
    act(() => result.current.handleRetryFromAssist());
    expect(handleRetry).toHaveBeenCalledTimes(1);
    expect(result.current.showRetryAssist).toBe(false);
  });
});
