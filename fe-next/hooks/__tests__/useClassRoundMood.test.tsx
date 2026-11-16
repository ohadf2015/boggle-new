// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadClassRoundRatings = vi.fn();
vi.mock('@/lib/education/classRoundRatingsRead', () => ({
  loadClassRoundRatings: (...args: unknown[]) => loadClassRoundRatings(...args),
}));

import { useClassRoundMood } from '../useClassRoundMood';

beforeEach(() => {
  loadClassRoundRatings.mockReset();
});

describe('useClassRoundMood', () => {
  it('does not keep the previous game mood while the next read is in flight', async () => {
    let resolveA: (value: string[]) => void = () => {};
    loadClassRoundRatings.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveA = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ gameCode }: { gameCode: string }) => useClassRoundMood({ classroomId: 'c1', gameCode }),
      { initialProps: { gameCode: 'GAME-A' } },
    );

    await act(async () => {
      resolveA(['great', 'great', 'great']);
    });
    expect(result.current).toEqual({ count: 3, mood: 'great' });

    let resolveB: (value: string[]) => void = () => {};
    loadClassRoundRatings.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveB = resolve;
      }),
    );
    rerender({ gameCode: 'GAME-B' });
    expect(result.current).toEqual({ count: 0, mood: null });

    await act(async () => {
      resolveB(['bad', 'bad']);
    });
    expect(result.current).toEqual({ count: 2, mood: 'rough' });
  });
});
