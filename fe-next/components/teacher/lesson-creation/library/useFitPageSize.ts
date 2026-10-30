'use client';

import { useEffect, useState } from 'react';

interface FitInput {
  availH: number;
  cardH: number;
  gap: number;
  cols: number;
}

export function fitPageSize({ availH, cardH, gap, cols }: FitInput, fallback = 12): number {
  if (cols < 1 || cardH <= 0) return fallback;
  const rows = Math.max(1, Math.floor((availH + gap) / (cardH + gap)));
  return rows * cols;
}

function measure(grid: HTMLElement, cardH: number, reserve: number, fallback: number): number {
  const region = grid.closest<HTMLElement>('.edu-shell-scroll') ?? document.documentElement;
  const regionStyle = getComputedStyle(region);
  const gridStyle = getComputedStyle(grid);
  const top = grid.getBoundingClientRect().top - region.getBoundingClientRect().top + region.scrollTop;
  const availH = region.clientHeight - parseFloat(regionStyle.paddingBottom || '0') - top - reserve;
  const cols = Math.max(1, gridStyle.gridTemplateColumns.split(' ').filter((c) => c && c !== 'none').length);
  const gap = parseFloat(gridStyle.rowGap) || 0;
  const tallest = Math.max(0, ...Array.from(grid.children, (c) => (c as HTMLElement).offsetHeight));
  return fitPageSize({ availH, cardH: tallest || cardH, gap, cols }, fallback);
}

/**
 * Cards per page so the grid plus its pager fit the shell's scroll region without scrolling.
 * Rows are sized by the tallest rendered card (`cardH` until one renders); `reserve` is the pager's height plus its gap.
 */
export function useFitPageSize(cardH: number, reserve: number, fallback = 12): [(el: HTMLElement | null) => void, number] {
  const [grid, setGrid] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState(fallback);

  useEffect(() => {
    if (!grid || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize(measure(grid, cardH, reserve, fallback)));
    };
    const ro = new ResizeObserver(update);
    const region = grid.closest<HTMLElement>('.edu-shell-scroll');
    if (region) ro.observe(region);
    for (let el = grid.parentElement; el && el !== region; el = el.parentElement) ro.observe(el);
    window.addEventListener('resize', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [grid, cardH, reserve, fallback]);

  return [setGrid, size];
}
