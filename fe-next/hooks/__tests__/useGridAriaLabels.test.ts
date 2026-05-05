import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGridAriaLabels } from '../useGridAriaLabels';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) =>
      `${k}:${JSON.stringify(vars ?? {})}`,
    language: 'en',
  }),
}));

describe('useGridAriaLabels', () => {
  it('returns one label per cell', () => {
    const grid = [['A', 'B'], ['C', 'D']];
    const { result } = renderHook(() => useGridAriaLabels(grid, 'seed1'));
    expect(result.current['0,0']).toMatch(/A/);
    expect(result.current['1,1']).toMatch(/D/);
    expect(Object.keys(result.current)).toHaveLength(4);
  });

  it('memoizes by seed: same seed === same object reference', () => {
    const grid = [['A', 'B']];
    const { result, rerender } = renderHook(({ s }) => useGridAriaLabels(grid, s), {
      initialProps: { s: 'seed1' },
    });
    const first = result.current;
    rerender({ s: 'seed1' });
    expect(result.current).toBe(first);
  });

  it('returns new object when seed changes', () => {
    const grid = [['A', 'B']];
    const { result, rerender } = renderHook(({ s }) => useGridAriaLabels(grid, s), {
      initialProps: { s: 'seed1' },
    });
    const first = result.current;
    rerender({ s: 'seed2' });
    expect(result.current).not.toBe(first);
  });

  it('handles empty grid', () => {
    const { result } = renderHook(() => useGridAriaLabels([], 'empty'));
    expect(Object.keys(result.current)).toHaveLength(0);
  });
});
