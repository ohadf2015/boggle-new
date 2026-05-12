import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoardCoords } from '../useBoardCoords';
import { useRef } from 'react';

function setupBoardEl(rows: number, cols: number) {
  const board = document.createElement('div');
  board.style.position = 'relative';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.dataset.boardCell = `${r},${c}`;
      cell.getBoundingClientRect = () => ({
        x: c * 40, y: r * 40, width: 40, height: 40,
        top: r * 40, left: c * 40, bottom: r * 40 + 40, right: c * 40 + 40,
        toJSON: () => ({}),
      } as DOMRect);
      board.appendChild(cell);
    }
  }
  document.body.appendChild(board);
  return board;
}

describe('useBoardCoords', () => {
  it('returns cell rect for a given row/col', () => {
    const boardEl = setupBoardEl(11, 11);
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(boardEl);
      return useBoardCoords(ref);
    });
    const rect = result.current.cellRect(2, 3);
    expect(rect?.x).toBe(120);
    expect(rect?.y).toBe(80);
  });

  it('returns null when board ref is null', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      return useBoardCoords(ref);
    });
    expect(result.current.cellRect(0, 0)).toBeNull();
  });

  it('subscribers can register and unsubscribe', () => {
    const boardEl = setupBoardEl(11, 11);
    const listener = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(boardEl);
      return useBoardCoords(ref);
    });
    const unsub = result.current.subscribe(listener);
    act(() => {
      result.current._notifyForTest?.();
    });
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});
