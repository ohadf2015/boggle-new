// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useWordTowerPlacingNudge } from '../useWordTowerPlacingNudge';

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: vi.fn(() => ({ variant: 'control', trackExposure: vi.fn() })),
}));

import { useExperiment } from '@/hooks/useExperiment';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.mocked(useExperiment).mockReturnValue({ variant: 'control', trackExposure: vi.fn() });
});

describe('useWordTowerPlacingNudge', () => {
  it('given control variant, when a blocked tap happens, then shake stays false', () => {
    const { result } = renderHook(() => useWordTowerPlacingNudge());
    act(() => result.current.onBlockedTap());
    expect(result.current.shake).toBe(false);
  });

  it('given the nudge variant, when a blocked tap happens, then shake flips true then auto-resets', () => {
    vi.useFakeTimers();
    vi.mocked(useExperiment).mockReturnValue({ variant: 'nudge', trackExposure: vi.fn() });
    const { result } = renderHook(() => useWordTowerPlacingNudge());
    act(() => result.current.onBlockedTap());
    expect(result.current.shake).toBe(true);
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.shake).toBe(false);
  });

  it('given the nudge variant, when mounted, then exposure is tracked once', () => {
    const trackExposure = vi.fn();
    vi.mocked(useExperiment).mockReturnValue({ variant: 'nudge', trackExposure });
    renderHook(() => useWordTowerPlacingNudge());
    expect(trackExposure).toHaveBeenCalledTimes(1);
  });
});
