import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GridConnectorOverlay from '../GridConnectorOverlay';
import type { SelectedCell } from '../types';
import { getSelectionEscalation } from '../selectionEscalation';

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

function parsePoints(pointsAttr: string | null): Array<{ x: number; y: number }> {
  if (!pointsAttr) return [];
  return pointsAttr.trim().split(/\s+/).map(pair => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  });
}

beforeEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  vi.restoreAllMocks();
});

describe('GridConnectorOverlay', () => {
  it('given 2 selected cells, renders one polyline with 2 points', async () => {
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
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(parsePoints(polyline!.getAttribute('points'))).toHaveLength(2);
  });

  it('given 3 selected cells, renders one polyline with 3 points', async () => {
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
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(parsePoints(polyline!.getAttribute('points'))).toHaveLength(3);
  });

  it('given 0 selected cells, renders nothing', async () => {
    const gridEl = buildGrid([]);
    const { container } = render(
      <GridConnectorOverlay selectedCells={[]} gridEl={gridEl} />,
    );
    await act(async () => {});
    expect(container.querySelector('polyline')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('given 1 selected cell, renders nothing', async () => {
    const gridEl = buildGrid([{ row: 0, col: 0, rect: { top: 0, left: 0 } }]);
    const { container } = render(
      <GridConnectorOverlay selectedCells={[{ row: 0, col: 0, letter: 'A' }]} gridEl={gridEl} />,
    );
    await act(async () => {});
    expect(container.querySelector('polyline')).toBeNull();
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

  it('shifts each point up by selection-escalation liftY so endpoints track lifted tile centers', async () => {
    // Cells laid out at row 0: layout centers at (50, 50) and (150, 50).
    const gridEl = buildGrid([
      { row: 0, col: 0, rect: { top: 0, left: 0 } },
      { row: 0, col: 1, rect: { top: 0, left: 100 } },
    ]);
    const cells: SelectedCell[] = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
    ];
    const { container } = render(
      <GridConnectorOverlay selectedCells={cells} gridEl={gridEl} comboLevel={0} />,
    );
    await act(async () => {});
    const polyline = container.querySelector('polyline');
    const pts = parsePoints(polyline!.getAttribute('points'));
    // Tier 0 base lift = -2 for both cells, so y should be 50 + (-2) = 48.
    const tier0Lift = getSelectionEscalation(0, 2, 0).liftY;
    expect(tier0Lift).toBe(-2);
    expect(pts[0].x).toBe(50);
    expect(pts[0].y).toBe(50 + tier0Lift);
    expect(pts[1].x).toBe(150);
    expect(pts[1].y).toBe(50 + tier0Lift);
  });

  it('applies per-index escalation lift on longer selections (higher tiers)', async () => {
    // 8-cell selection across row 0 — escalation tier reaches fire, liftY varies per depth.
    const grid: { row: number; col: number; rect: Partial<DOMRect> }[] = [];
    for (let c = 0; c < 8; c++) grid.push({ row: 0, col: c, rect: { top: 0, left: c * 50 } });
    const gridEl = buildGrid(grid);
    const cells: SelectedCell[] = grid.map(({ row, col }) => ({ row, col, letter: 'X' }));
    const { container } = render(
      <GridConnectorOverlay selectedCells={cells} gridEl={gridEl} comboLevel={0} />,
    );
    await act(async () => {});
    const pts = parsePoints(container.querySelector('polyline')!.getAttribute('points'));
    expect(pts).toHaveLength(8);
    // Verify each point's y matches base center (50) + that index's escalation liftY.
    // Cells are 100px tall but mocked with width=height=100 → vertical center y = 50.
    for (let i = 0; i < 8; i++) {
      const liftY = getSelectionEscalation(i, 8, 0).liftY;
      expect(pts[i].y).toBeCloseTo(50 + liftY, 5);
    }
    // Sanity: later indices have larger lift than first (escalation grows).
    expect(getSelectionEscalation(7, 8, 0).liftY)
      .toBeLessThan(getSelectionEscalation(0, 8, 0).liftY);
  });

  it('honors comboLevel — higher combo amplifies lift', async () => {
    const gridEl = buildGrid([
      { row: 0, col: 0, rect: { top: 0, left: 0 } },
      { row: 0, col: 1, rect: { top: 0, left: 100 } },
      { row: 0, col: 2, rect: { top: 0, left: 200 } },
    ]);
    const cells: SelectedCell[] = [
      { row: 0, col: 0, letter: 'A' },
      { row: 0, col: 1, letter: 'B' },
      { row: 0, col: 2, letter: 'C' },
    ];
    const { container, rerender } = render(
      <GridConnectorOverlay selectedCells={cells} gridEl={gridEl} comboLevel={0} />,
    );
    await act(async () => {});
    const ptsNoCombo = parsePoints(container.querySelector('polyline')!.getAttribute('points'));

    rerender(<GridConnectorOverlay selectedCells={cells} gridEl={gridEl} comboLevel={5} />);
    await act(async () => {});
    const ptsCombo = parsePoints(container.querySelector('polyline')!.getAttribute('points'));

    // At combo 5, escalation tier shifts up (effectiveLength += 2.5), liftY grows in magnitude.
    // Last point should sit higher (smaller y) than at combo 0.
    expect(ptsCombo[2].y).toBeLessThan(ptsNoCombo[2].y);
  });
});
