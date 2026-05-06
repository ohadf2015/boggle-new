import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GridConnectorOverlay from '../GridConnectorOverlay';
import type { SelectedCell } from '../types';

function buildGrid(cells: { row: number; col: number; rect: Partial<DOMRect> }[]) {
  const gridEl = document.createElement('div');
  vi.spyOn(gridEl, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, width: 300, height: 300,
    top: 0, left: 0, right: 300, bottom: 300, toJSON: () => ({}),
  } as DOMRect);

  for (const { row, col, rect } of cells) {
    const cellEl = document.createElement('div');
    cellEl.setAttribute('data-row', String(row));
    cellEl.setAttribute('data-col', String(col));
    vi.spyOn(cellEl, 'getBoundingClientRect').mockReturnValue({
      x: rect.left ?? 0, y: rect.top ?? 0,
      width: 100, height: 100,
      top: rect.top ?? 0, left: rect.left ?? 0,
      right: (rect.left ?? 0) + 100, bottom: (rect.top ?? 0) + 100,
      toJSON: () => ({}),
    } as DOMRect);
    gridEl.appendChild(cellEl);
  }
  document.body.appendChild(gridEl);
  return gridEl;
}

beforeEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  vi.restoreAllMocks();
});

describe('GridConnectorOverlay', () => {
  it('given 2 selected cells, renders 1 SVG line', async () => {
    const gridEl = buildGrid([
      { row: 0, col: 0, rect: { top: 0, left: 0 } },
      { row: 0, col: 1, rect: { top: 0, left: 100 } },
    ]);
    const cells: SelectedCell[] = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
    ];
    const { container } = render(
      <GridConnectorOverlay selectedCells={cells} gridEl={gridEl} />,
    );
    await act(async () => {});
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelectorAll('line')).toHaveLength(1);
  });

  it('given 3 selected cells, renders 2 SVG lines', async () => {
    const gridEl = buildGrid([
      { row: 0, col: 0, rect: { top: 0, left: 0 } },
      { row: 0, col: 1, rect: { top: 0, left: 100 } },
      { row: 1, col: 1, rect: { top: 100, left: 100 } },
    ]);
    const cells: SelectedCell[] = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
      { row: 1, col: 1, letter: 'C' },
    ];
    const { container } = render(
      <GridConnectorOverlay selectedCells={cells} gridEl={gridEl} />,
    );
    await act(async () => {});
    expect(container.querySelectorAll('line')).toHaveLength(2);
  });

  it('given 0 selected cells, renders no lines', async () => {
    const gridEl = buildGrid([]);
    const { container } = render(
      <GridConnectorOverlay selectedCells={[]} gridEl={gridEl} />,
    );
    await act(async () => {});
    expect(container.querySelectorAll('line')).toHaveLength(0);
  });

  it('given 1 selected cell, renders no lines', async () => {
    const gridEl = buildGrid([{ row: 0, col: 0, rect: { top: 0, left: 0 } }]);
    const { container } = render(
      <GridConnectorOverlay selectedCells={[{ row: 0, col: 0, letter: 'A' }]} gridEl={gridEl} />,
    );
    await act(async () => {});
    expect(container.querySelectorAll('line')).toHaveLength(0);
  });

  it('given null gridEl, renders nothing', () => {
    const { container } = render(
      <GridConnectorOverlay
        selectedCells={[{ row: 0, col: 0, letter: 'A' }, { row: 0, col: 1, letter: 'B' }]}
        gridEl={null}
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });
});
