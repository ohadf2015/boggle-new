// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExperiment } from '@/hooks/useExperiment';
import { useWordTowerPlacingNudge } from '../useWordTowerPlacingNudge';

vi.mock('@/hooks/useExperiment', () => ({ useExperiment: vi.fn() }));

const setVariant = (variant: string) =>
  vi.mocked(useExperiment).mockReturnValue({ variant } as unknown as ReturnType<typeof useExperiment>);

describe('useWordTowerPlacingNudge', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('given control, then it adds no props to the dock', () => {
    setVariant('control');
    const { result } = renderHook(() => useWordTowerPlacingNudge());
    expect(result.current).toEqual({});
  });

  it('given nudge, when a blocked tap lands, then DROP shakes once and stops after the animation', () => {
    setVariant('nudge');
    const { result } = renderHook(() => useWordTowerPlacingNudge());
    expect(result.current.shake).toBe(false);
    act(() => result.current.onBlockedTap?.());
    expect(result.current.shake).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.shake).toBe(false);
  });
});
