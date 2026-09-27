import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Storage mock so the hook runs in jsdom without localStorage.
vi.mock('../../utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => true,
  markGuidanceShown: vi.fn(),
}));

import { useTapToDragGuidance } from '../useTapToDragGuidance';

describe('useTapToDragGuidance', () => {
  // Perf guard: the returned object is a dep of handleSingleTap in InGameScreen,
  // which flows to the grid as onSingleTapDetected. A fresh literal every render
  // breaks GridComponent's memo on every parent render (per-second timer tick).
  it('returns a stable reference across renders when state is unchanged', () => {
    const { result, rerender } = renderHook(() => useTapToDragGuidance());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('still updates (new reference) when the tutorial is shown', () => {
    const { result } = renderHook(() => useTapToDragGuidance());
    const before = result.current;
    act(() => {
      result.current.handleSingleTapDetected({ row: 0, col: 0, letter: 'A' });
    });
    expect(result.current.showDragTutorial).toBe(true);
    expect(result.current).not.toBe(before);
  });
});
