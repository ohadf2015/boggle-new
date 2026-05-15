import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useSwipeGesture } from '../useSwipeGesture';
import { createBag } from '@/lib/word-craft/tileBag';
import { createGrid, cellAt } from '@/lib/word-craft/cascade/boardGrid';

function makeGrid() {
  return createGrid(3, 3, createBag({ seed: 1, locale: 'en' }));
}

interface HostProps {
  diagonal?: boolean;
  onSubmit: (p: string[]) => void;
  onPathChange?: (p: string[]) => void;
}
function Host({ diagonal, onSubmit, onPathChange }: HostProps) {
  const [grid] = useState(() => makeGrid());
  const swipe = useSwipeGesture({
    grid,
    diagonal,
    onPathSubmit: onSubmit,
    onPathChange,
  });
  return (
    <div data-testid="board" {...swipe.handlers} data-dragging={String(swipe.isDragging)}>
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const cell = cellAt(grid, r, c)!;
        return (
          <button
            key={cell.id}
            type="button"
            data-cell-id={cell.id}
            data-row={r}
            data-col={c}
            data-testid={`cell-${r}-${c}`}
          >
            {cell.letter}
          </button>
        );
      })}
    </div>
  );
}

function mockElementFromPoint(getCell: (x: number, y: number) => HTMLElement | null) {
  return vi.spyOn(document, 'elementFromPoint').mockImplementation(getCell as never);
}

describe('cascade/useSwipeGesture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a path from contiguous pointer moves', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<Host onSubmit={onSubmit} />);
    const c00 = getByTestId('cell-0-0');
    const c01 = getByTestId('cell-0-1');
    const c02 = getByTestId('cell-0-2');

    mockElementFromPoint((x) => {
      if (x === 1) return c00;
      if (x === 2) return c01;
      if (x === 3) return c02;
      return null;
    });

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 3, clientY: 1, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 3, clientY: 1, pointerId: 1 });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [path] = onSubmit.mock.calls[0];
    expect(path).toHaveLength(3);
  });

  it('rejects non-adjacent jumps', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<Host onSubmit={onSubmit} />);
    const c00 = getByTestId('cell-0-0');
    const c02 = getByTestId('cell-0-2');

    mockElementFromPoint((x) => {
      if (x === 1) return c00;
      if (x === 2) return c02;
      return null;
    });

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 1, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 2, clientY: 1, pointerId: 1 });

    const [path] = onSubmit.mock.calls[0];
    expect(path).toEqual([c00.dataset.cellId]); // 0,2 was rejected
  });

  it('rejects diagonal step when diagonal=false', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<Host onSubmit={onSubmit} />);
    const c00 = getByTestId('cell-0-0');
    const c11 = getByTestId('cell-1-1');

    mockElementFromPoint((x) => {
      if (x === 1) return c00;
      if (x === 2) return c11;
      return null;
    });

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 2, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 2, clientY: 2, pointerId: 1 });

    const [path] = onSubmit.mock.calls[0];
    expect(path).toEqual([c00.dataset.cellId]);
  });

  it('accepts diagonal step when diagonal=true', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<Host diagonal onSubmit={onSubmit} />);
    const c00 = getByTestId('cell-0-0');
    const c11 = getByTestId('cell-1-1');

    mockElementFromPoint((x) => {
      if (x === 1) return c00;
      if (x === 2) return c11;
      return null;
    });

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 2, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 2, clientY: 2, pointerId: 1 });

    const [path] = onSubmit.mock.calls[0];
    expect(path).toHaveLength(2);
  });

  it('backtracks when pointer returns to previous cell', () => {
    const onSubmit = vi.fn();
    const onPathChange = vi.fn();
    const { getByTestId } = render(
      <Host onSubmit={onSubmit} onPathChange={onPathChange} />,
    );
    const c00 = getByTestId('cell-0-0');
    const c01 = getByTestId('cell-0-1');
    const c02 = getByTestId('cell-0-2');

    mockElementFromPoint((x) => {
      if (x === 1) return c00;
      if (x === 2) return c01;
      if (x === 3) return c02;
      return null;
    });

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 3, clientY: 1, pointerId: 1 });
    // Now move back to c01 → should drop c02
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 1, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 2, clientY: 1, pointerId: 1 });

    const [path] = onSubmit.mock.calls[0];
    expect(path).toHaveLength(2);
  });

  it('ignores moves when no pointerdown has fired', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<Host onSubmit={onSubmit} />);
    const c00 = getByTestId('cell-0-0');
    mockElementFromPoint(() => c00);
    fireEvent.pointerMove(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects reusing the same cell', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<Host onSubmit={onSubmit} />);
    const c00 = getByTestId('cell-0-0');
    const c01 = getByTestId('cell-0-1');

    mockElementFromPoint((x) => (x === 1 ? c00 : x === 2 ? c01 : x === 3 ? c00 : null));

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 1, pointerId: 1 });
    // Re-enter c00 from c01 — that's a backtrack of c01? No — c00 is the previous cell
    // of c01, so this IS a backtrack and drops c01.
    fireEvent.pointerMove(c00, { clientX: 3, clientY: 1, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 3, clientY: 1, pointerId: 1 });

    const [path] = onSubmit.mock.calls[0];
    expect(path).toEqual([c00.dataset.cellId]);
  });
});
