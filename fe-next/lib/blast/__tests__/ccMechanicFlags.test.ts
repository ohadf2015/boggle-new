import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useJellyEnabled, useCakeEnabled, useChocolateEnabled } from '../ccMechanicFlags';

const mockExperiment = vi.fn();

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: (key: string) => mockExperiment(key),
}));

describe('CC mechanic flag hooks', () => {
  beforeEach(() => mockExperiment.mockReset());

  it('useJellyEnabled true on treatment', () => {
    mockExperiment.mockReturnValue({ variant: 'treatment', trackExposure: () => {} });
    const { result } = renderHook(() => useJellyEnabled());
    expect(result.current).toBe(true);
    expect(mockExperiment).toHaveBeenCalledWith('blast.jelly');
  });

  it('useCakeEnabled false on control', () => {
    mockExperiment.mockReturnValue({ variant: 'control', trackExposure: () => {} });
    const { result } = renderHook(() => useCakeEnabled());
    expect(result.current).toBe(false);
    expect(mockExperiment).toHaveBeenCalledWith('blast.cake');
  });

  it('useChocolateEnabled false on control', () => {
    mockExperiment.mockReturnValue({ variant: 'control', trackExposure: () => {} });
    const { result } = renderHook(() => useChocolateEnabled());
    expect(result.current).toBe(false);
    expect(mockExperiment).toHaveBeenCalledWith('blast.chocolate');
  });
});
