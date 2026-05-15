import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { BlastLevel } from '@/lib/blast/v2/types';

const mockLevel: BlastLevel = {
  id: 'board-pointer-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastBoard pointer-move drag selection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fires onPointerEnter when pointer moves over a tile (board-level resolution)', () => {
    const onPointerEnter = vi.fn();
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'active', cells: ['c0r0'], axis: 'undecided', mode: 'drag' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={onPointerEnter}
        onPointerUp={vi.fn()}
        tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        boardRows={3}
      />
    );

    const targetTile = container.querySelector('[data-cell-id="c1r0"]') as HTMLElement;
    expect(targetTile).toBeInTheDocument();

    const board = container.querySelector('[data-testid="blast-board"]') as HTMLElement;
    const originalFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => targetTile) as typeof document.elementFromPoint;

    fireEvent.pointerMove(board, { clientX: 100, clientY: 100, pointerId: 1 });

    document.elementFromPoint = originalFromPoint;

    expect(onPointerEnter).toHaveBeenCalledWith('c1r0');
  });

  it('does not call onPointerEnter twice in a row for the same cell', () => {
    const onPointerEnter = vi.fn();
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'active', cells: ['c0r0'], axis: 'undecided', mode: 'drag' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={onPointerEnter}
        onPointerUp={vi.fn()}
        tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        boardRows={3}
      />
    );

    const board = container.querySelector('[data-testid="blast-board"]') as HTMLElement;
    const tileC1r0 = container.querySelector('[data-cell-id="c1r0"]') as HTMLElement;
    const originalFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => tileC1r0) as typeof document.elementFromPoint;

    fireEvent.pointerMove(board, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(board, { clientX: 101, clientY: 101, pointerId: 1 });

    document.elementFromPoint = originalFromPoint;

    expect(onPointerEnter).toHaveBeenCalledTimes(1);
  });

  it('ignores pointermove when selection idle (no drag in progress)', () => {
    const onPointerEnter = vi.fn();
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={onPointerEnter}
        onPointerUp={vi.fn()}
        tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        boardRows={3}
      />
    );

    const board = container.querySelector('[data-testid="blast-board"]') as HTMLElement;
    const tile = container.querySelector('[data-cell-id="c1r0"]') as HTMLElement;
    const originalFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => tile) as typeof document.elementFromPoint;

    fireEvent.pointerMove(board, { clientX: 100, clientY: 100, pointerId: 1 });

    document.elementFromPoint = originalFromPoint;

    expect(onPointerEnter).not.toHaveBeenCalled();
  });

  it('resolves cell via [data-cell-id] ancestor (inner span)', () => {
    const onPointerEnter = vi.fn();
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'active', cells: ['c0r0'], axis: 'undecided', mode: 'drag' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={onPointerEnter}
        onPointerUp={vi.fn()}
        tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        boardRows={3}
      />
    );

    const board = container.querySelector('[data-testid="blast-board"]') as HTMLElement;
    const innerSpan = container.querySelector('[data-cell-id="c1r0"] span') as HTMLElement;
    expect(innerSpan).toBeInTheDocument();

    const originalFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => innerSpan) as typeof document.elementFromPoint;

    fireEvent.pointerMove(board, { clientX: 100, clientY: 100, pointerId: 1 });

    document.elementFromPoint = originalFromPoint;

    expect(onPointerEnter).toHaveBeenCalledWith('c1r0');
  });
});
