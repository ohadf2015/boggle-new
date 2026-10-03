'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import { rowsThatFit } from './rowsThatFit';

const ROW_SELECTOR = '[data-testid="live-board-row"]';
const OVERFLOW_LINE_PX = 36;

export function useRowsThatFit(scrollerRef: RefObject<HTMLElement | null>, total: number): number {
  const [fit, setFit] = useState(total);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const content = scroller.firstElementChild as HTMLElement | null;
      const overflowLine = scroller.nextElementSibling as HTMLElement | null;
      const next = rowsThatFit({
        containerPx: scroller.clientHeight + (overflowLine?.offsetHeight ?? 0),
        overflowLinePx: OVERFLOW_LINE_PX,
        contentPx: content?.getBoundingClientRect().height ?? 0,
        renderedRows: scroller.querySelectorAll(ROW_SELECTOR).length,
        total,
      });
      setFit((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => observer.disconnect();
  }, [scrollerRef, total]);

  return Math.min(fit, total);
}
