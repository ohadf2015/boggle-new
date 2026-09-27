import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

export interface BoardCoords {
  cellRect(row: number, col: number): DOMRect | null;
  scoreChipRect(): DOMRect | null;
  bagRect(): DOMRect | null;
  subscribe(listener: () => void): () => void;
  _notifyForTest?(): void;
}

export function useBoardCoords(boardRef: RefObject<HTMLElement | null>): BoardCoords {
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => notify());
    ro.observe(el);
    const onResize = () => notify();
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [boardRef, notify]);

  return useMemo<BoardCoords>(
    () => ({
      cellRect(row, col) {
        const el = boardRef.current;
        if (!el) return null;
        const cell = el.querySelector<HTMLElement>(`[data-board-cell="${row},${col}"]`);
        return cell?.getBoundingClientRect() ?? null;
      },
      scoreChipRect() {
        const node = document.querySelector<HTMLElement>('[data-wc-score-chip]');
        return node?.getBoundingClientRect() ?? null;
      },
      bagRect() {
        const node = document.querySelector<HTMLElement>('[data-wc-bag]');
        return node?.getBoundingClientRect() ?? null;
      },
      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      _notifyForTest: notify,
    }),
    [boardRef, notify],
  );
}
