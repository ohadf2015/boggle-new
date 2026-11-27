'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Cell } from '@/lib/holidays/dailyBoard';

export const BONUS_TILE_CLASS = 'holiday-bonus-tile';

export interface TileRect {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const keyOf = (c: Cell) => `${c.row}-${c.col}`;

function tilesIn(scope: Element, cells: readonly Cell[]): Array<[Cell, Element]> {
  const out: Array<[Cell, Element]> = [];
  for (const c of cells) {
    const el = scope.querySelector(`[data-board] [data-tile][data-row="${c.row}"][data-col="${c.col}"]`);
    if (el) out.push([c, el]);
  }
  return out;
}

export function useHolidayTiles(layerRef: RefObject<HTMLElement | null>, cells: readonly Cell[]) {
  const [rects, setRects] = useState<TileRect[]>([]);
  const [board, setBoard] = useState<Omit<TileRect, 'key'> | null>(null);

  const measure = useCallback(() => {
    const layer = layerRef.current;
    const scope = layer?.parentElement;
    if (!layer || !scope) return;
    const base = layer.getBoundingClientRect();
    const b = scope.querySelector('[data-board]')?.getBoundingClientRect();
    setBoard(b ? { left: b.left - base.left, top: b.top - base.top, width: b.width, height: b.height } : null);
    setRects(
      tilesIn(scope, cells).map(([c, el]) => {
        const r = el.getBoundingClientRect();
        return { key: keyOf(c), left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
      }),
    );
  }, [layerRef, cells]);

  useEffect(() => {
    const scope = layerRef.current?.parentElement;
    if (!scope) return;
    const mark = () => {
      for (const [, el] of tilesIn(scope, cells)) if (!el.classList.contains(BONUS_TILE_CLASS)) el.classList.add(BONUS_TILE_CLASS);
    };
    mark();
    measure();
    const mo = new MutationObserver(() => mark());
    if (cells.length) mo.observe(scope, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    const board = scope.querySelector('[data-board]');
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (board && ro) ro.observe(board);
    window.addEventListener('resize', measure);
    return () => {
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      for (const [, el] of tilesIn(scope, cells)) el.classList.remove(BONUS_TILE_CLASS);
    };
  }, [layerRef, cells, measure]);

  return { rects, board, measure };
}
