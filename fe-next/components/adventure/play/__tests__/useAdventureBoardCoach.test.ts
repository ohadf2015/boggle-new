// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const coach = { markActivity: vi.fn(), markTap: vi.fn(), markDragStart: vi.fn(), markSubmit: vi.fn() };
const useStuckCoach = vi.fn((_args: unknown) => coach);
vi.mock('@/hooks/useStuckCoach', () => ({ useStuckCoach: (a: unknown) => useStuckCoach(a) }));

import { useAdventureBoardCoach } from '../useAdventureBoardCoach';

const grid = [['c', 'a'], ['t', 's']];

describe('useAdventureBoardCoach', () => {
  beforeEach(() => vi.clearAllMocks());

  it('given a live fight, when mounted, then the shared stuck coach watches it as adventure with its words and board', () => {
    renderHook(() => useAdventureBoardCoach({ active: true, grid, wordsFound: 0, language: 'en' }));
    expect(useStuckCoach).toHaveBeenCalledWith(expect.objectContaining({ mode: 'adventure', active: true, wordsFound: 0, grid, language: 'en', sessionKey: 'ca|ts' }));
  });

  it('given a single tile tapped and released, when reported, then the coach counts a tap', () => {
    const { result } = renderHook(() => useAdventureBoardCoach({ active: true, grid, wordsFound: 0, language: 'en' }));
    result.current.onSingleTapDetected({ row: 0, col: 0, letter: 'c' });
    expect(coach.markTap).toHaveBeenCalledTimes(1);
  });

  it('given a traced path, when it grows past one tile, then one drag is counted per gesture', () => {
    const { result } = renderHook(() => useAdventureBoardCoach({ active: true, grid, wordsFound: 0, language: 'en' }));
    result.current.onWordChange('c', 1);
    result.current.onWordChange('ca', 2);
    result.current.onWordChange('cat', 3);
    expect(coach.markDragStart).toHaveBeenCalledTimes(1);
    result.current.onWordChange('', 0);
    result.current.onWordChange('ts', 2);
    expect(coach.markDragStart).toHaveBeenCalledTimes(2);
    expect(coach.markActivity).toHaveBeenCalled();
  });
});
