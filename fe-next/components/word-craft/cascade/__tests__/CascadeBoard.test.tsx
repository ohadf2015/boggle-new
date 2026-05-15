import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CascadeBoard } from '../CascadeBoard';
import { createBag } from '@/lib/word-craft/tileBag';
import { createGrid, setCellLetter, cellAt } from '@/lib/word-craft/cascade/boardGrid';

function fixedGrid() {
  const g = createGrid(3, 3, createBag({ seed: 1, locale: 'en' }));
  const letters = ['S', 'T', 'A', 'R', 'B', 'C', 'D', 'E', 'F'];
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    setCellLetter(g, r, c, letters[i], 1);
  }
  return g;
}

describe('cascade/CascadeBoard', () => {
  it('renders one cell per grid position with data-cell-id', () => {
    const grid = fixedGrid();
    const { container } = render(
      <CascadeBoard grid={grid} onSubmitPath={() => {}} />,
    );
    const cells = container.querySelectorAll('[data-cell-id]');
    expect(cells.length).toBe(9);
  });

  it('renders letters in cells', () => {
    const grid = fixedGrid();
    const { getByText } = render(
      <CascadeBoard grid={grid} onSubmitPath={() => {}} />,
    );
    expect(getByText('S')).toBeTruthy();
    expect(getByText('T')).toBeTruthy();
  });

  it('submits a 3+ length path on pointer-up', () => {
    const grid = fixedGrid();
    const onSubmitPath = vi.fn();
    const { container } = render(
      <CascadeBoard grid={grid} onSubmitPath={onSubmitPath} />,
    );
    const c00 = container.querySelector<HTMLElement>(
      `[data-cell-id="${cellAt(grid, 0, 0)!.id}"]`,
    )!;
    const c01 = container.querySelector<HTMLElement>(
      `[data-cell-id="${cellAt(grid, 0, 1)!.id}"]`,
    )!;
    const c02 = container.querySelector<HTMLElement>(
      `[data-cell-id="${cellAt(grid, 0, 2)!.id}"]`,
    )!;
    vi.spyOn(document, 'elementFromPoint').mockImplementation(
      ((x: number) => (x === 1 ? c00 : x === 2 ? c01 : c02)) as never,
    );

    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 2, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(c00, { clientX: 3, clientY: 1, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 3, clientY: 1, pointerId: 1 });

    expect(onSubmitPath).toHaveBeenCalledTimes(1);
    expect(onSubmitPath.mock.calls[0][0]).toHaveLength(3);
  });

  it('does not submit if path < 3', () => {
    const grid = fixedGrid();
    const onSubmitPath = vi.fn();
    const { container } = render(
      <CascadeBoard grid={grid} onSubmitPath={onSubmitPath} />,
    );
    const c00 = container.querySelector<HTMLElement>(
      `[data-cell-id="${cellAt(grid, 0, 0)!.id}"]`,
    )!;
    fireEvent.pointerDown(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerUp(c00, { clientX: 1, clientY: 1, pointerId: 1 });
    expect(onSubmitPath).not.toHaveBeenCalled();
  });

  it('renders empty cells differently when letter is null', () => {
    const grid = fixedGrid();
    setCellLetter(grid, 0, 0, null, 0);
    const { container } = render(
      <CascadeBoard grid={grid} onSubmitPath={() => {}} />,
    );
    const burnedCell = container.querySelector<HTMLElement>(
      `[data-cell-id="${cellAt(grid, 0, 0)!.id}"]`,
    )!;
    expect(burnedCell.className).toMatch(/text-transparent/);
  });

  it('honors disabled prop', () => {
    const grid = fixedGrid();
    const onSubmitPath = vi.fn();
    const { container } = render(
      <CascadeBoard grid={grid} onSubmitPath={onSubmitPath} disabled />,
    );
    const board = container.querySelector('[data-testid="cascade-board"]')!;
    expect(board.className).toMatch(/pointer-events-none/);
  });

  it('shows fire indicator on bottom rows when fireRow > 0', () => {
    const grid = fixedGrid();
    const { container } = render(
      <CascadeBoard grid={grid} onSubmitPath={() => {}} fireRow={2} />,
    );
    // Last row should have ring-neo-orange via class
    const lastCell = container.querySelector<HTMLElement>(
      `[data-cell-id="${cellAt(grid, 2, 0)!.id}"]`,
    )!;
    expect(lastCell.className).toMatch(/ring-neo-orange/);
  });
});
