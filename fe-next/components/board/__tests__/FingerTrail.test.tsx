import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FingerTrail from '../FingerTrail';
import type { SelectedCell } from '@/components/grid/types';
import { getSelectionEscalation } from '@/components/grid/selectionEscalation';

function buildGrid(cells: { row: number; col: number; left: number; top: number }[]) {
  const gridEl = document.createElement('div');
  vi.spyOn(gridEl, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300, toJSON: () => ({}),
  } as DOMRect);
  for (const c of cells) {
    const el = document.createElement('div');
    el.setAttribute('data-row', String(c.row));
    el.setAttribute('data-col', String(c.col));
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      x: c.left, y: c.top, width: 100, height: 100, top: c.top, left: c.left,
      right: c.left + 100, bottom: c.top + 100, toJSON: () => ({}),
    } as DOMRect);
    gridEl.appendChild(el);
  }
  document.body.appendChild(gridEl);
  return gridEl;
}

function pts(attr: string | null): Array<{ x: number; y: number }> {
  if (!attr) return [];
  return attr.trim().split(/\s+/).map((p) => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
}

const wait = () => new Promise((r) => setTimeout(r, 40));

beforeEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  vi.restoreAllMocks();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FingerTrail', () => {
  const twoCells: SelectedCell[] = [
    { row: 0, col: 0, letter: 'A' },
    { row: 0, col: 1, letter: 'B' },
  ];
  const grid = () => buildGrid([
    { row: 0, col: 0, left: 0, top: 0 },
    { row: 0, col: 1, left: 100, top: 0 },
  ]);

  it('given no selection, renders nothing', () => {
    const { container } = render(<FingerTrail selectedCells={[]} gridEl={grid()} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('given a two-cell selection, draws the ink underlay, accent halo and accent core through the lifted centers', async () => {
    const { container } = render(<FingerTrail selectedCells={twoCells} gridEl={grid()} />);
    await act(async () => {});
    const lines = container.querySelectorAll('[data-trail-layer="committed"] polyline');
    expect(lines).toHaveLength(3);
    const lift = getSelectionEscalation(0, 2, 0).liftY;
    const first = pts(lines[0].getAttribute('points'));
    expect(first).toEqual([{ x: 50, y: 50 + lift }, { x: 150, y: 50 + lift }]);
    expect(lines[0].getAttribute('stroke')?.toLowerCase()).toBe('#0b1530');
    expect(lines[2].getAttribute('stroke')?.toLowerCase()).toBe('#bfff00');
  });

  it('given a live drag, the tail follows the pointer from the last committed tile', async () => {
    const gridEl = grid();
    const { container } = render(<FingerTrail selectedCells={twoCells} gridEl={gridEl} />);
    await act(async () => {});
    act(() => {
      fireEvent.pointerMove(document, { clientX: 220, clientY: 60 });
    });
    await act(async () => { await wait(); });
    const tail = container.querySelector('[data-trail-layer="tail"] polyline');
    const tp = pts(tail!.getAttribute('points'));
    expect(tp).toHaveLength(2);
    expect(tp[1]).toEqual({ x: 220, y: 60 });
    expect(tp[0].x).toBe(150);
  });

  it('given no selection, ignores pointer moves and draws no tail', async () => {
    const { container } = render(<FingerTrail selectedCells={[]} gridEl={grid()} />);
    await act(async () => {
      fireEvent.pointerMove(document, { clientX: 220, clientY: 60 });
      await wait();
    });
    expect(container.querySelector('svg')).toBeNull();
  });

  it('given a null grid element, renders nothing', () => {
    const { container } = render(<FingerTrail selectedCells={twoCells} gridEl={null} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
