import { fireEvent } from '@testing-library/react';

export const TILE = 100;
export const GAP = 10;

export function centre(row: number, col: number) {
  return { x: col * (TILE + GAP) + TILE / 2, y: row * (TILE + GAP) + TILE / 2 };
}

function rect(x: number, y: number, w: number, h: number): DOMRect {
  return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect;
}

/** Lays tiles out on a fixed 110px pitch so geometry-based hit testing works in a DOM without layout. */
export function stubBoardLayout(): () => void {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function stubbed(this: HTMLElement) {
    const { row, col } = this.dataset;
    if (this.hasAttribute('data-tile') && row != null && col != null) {
      const c = centre(Number(row), Number(col));
      return rect(c.x - TILE / 2, c.y - TILE / 2, TILE, TILE);
    }
    if (this.getAttribute('role') === 'grid') return rect(0, 0, 3 * TILE + 2 * GAP, 3 * TILE + 2 * GAP);
    return original.call(this);
  };
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
}

export function tileEl(container: HTMLElement, row: number, col: number): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-tile][data-row="${row}"][data-col="${col}"]`);
  if (!el) throw new Error(`no tile ${row},${col}`);
  return el;
}

type PType = 'mouse' | 'touch';

export function press(container: HTMLElement, row: number, col: number, pointerType: PType = 'mouse') {
  const p = centre(row, col);
  fireEvent.pointerDown(tileEl(container, row, col), { clientX: p.x, clientY: p.y, pointerId: 1, pointerType, button: 0, isPrimary: true });
}

export function moveTo(container: HTMLElement, row: number, col: number, pointerType: PType = 'mouse') {
  const p = centre(row, col);
  const grid = container.querySelector('[role="grid"]') as HTMLElement;
  fireEvent.pointerMove(grid, { clientX: p.x, clientY: p.y, pointerId: 1, pointerType });
}

export function release(container: HTMLElement, pointerType: PType = 'mouse') {
  const grid = container.querySelector('[role="grid"]') as HTMLElement;
  fireEvent.pointerUp(grid, { pointerId: 1, pointerType });
}

export function drag(container: HTMLElement, cells: Array<[number, number]>, pointerType: PType = 'mouse') {
  const [first, ...rest] = cells;
  press(container, first[0], first[1], pointerType);
  for (const [r, c] of rest) moveTo(container, r, c, pointerType);
}

export function selectedKeys(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-tile][data-sel]')]
    .sort((a, b) => Number(a.style.getPropertyValue('--sel-i')) - Number(b.style.getPropertyValue('--sel-i')))
    .map((el) => `${el.dataset.row}-${el.dataset.col}`);
}
