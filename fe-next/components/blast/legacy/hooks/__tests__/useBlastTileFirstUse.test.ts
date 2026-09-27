import { renderHook, act } from '@testing-library/react';
import { useBlastTileFirstUse } from '../useBlastTileFirstUse';
import type { BlastTileState, BlastTileType } from '../../types';

const cell = (type: BlastTileType, isCleared = false): BlastTileState => ({
  uid: `${type}-${Math.random()}`,
  row: 0,
  col: 0,
  type,
  isCleared,
  activationEffect: null,
  hitsRemaining: 0,
});

const board = (...types: BlastTileType[]): BlastTileState[][] => [types.map((t) => cell(t))];

beforeEach(() => {
  window.localStorage.clear();
});

describe('useBlastTileFirstUse', () => {
  it('teaches the first unseen special on the board', () => {
    const { result } = renderHook(() => useBlastTileFirstUse(board('bomb', 'standard'), true));
    expect(result.current.teaching).toBe('bomb');
  });

  it('does not teach anything when disabled', () => {
    const { result } = renderHook(() => useBlastTileFirstUse(board('bomb'), false));
    expect(result.current.teaching).toBeNull();
  });

  it('teaches each tile only once, persisting across remounts', () => {
    const first = renderHook(() => useBlastTileFirstUse(board('bomb'), true));
    expect(first.result.current.teaching).toBe('bomb');
    first.unmount();

    // Fresh mount, bomb already seen → no repeat even though it's on the board.
    const second = renderHook(() => useBlastTileFirstUse(board('bomb'), true));
    expect(second.result.current.teaching).toBeNull();
  });

  it('advances to the next unseen tile after dismiss + board change', () => {
    const { result, rerender } = renderHook(
      ({ b }: { b: BlastTileState[][] }) => useBlastTileFirstUse(b, true),
      { initialProps: { b: board('bomb') } },
    );
    expect(result.current.teaching).toBe('bomb');
    act(() => result.current.dismiss());
    expect(result.current.teaching).toBeNull();
    // ice now on the board → taught next.
    rerender({ b: board('bomb', 'ice') });
    expect(result.current.teaching).toBe('ice');
  });
});
