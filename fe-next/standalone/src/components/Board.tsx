import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { extendPath, pathToWord, type Cell } from '../core/pathTrace';
import type { LetterGrid } from '../core/board';

interface Props {
  board: LetterGrid;
  onSubmit: (word: string) => void;
  /** pulse key: when it changes with a type, the board flashes accept/reject. */
  flash: { id: number; type: 'accept' | 'reject' } | null;
}

/**
 * Drag-to-trace board (mouse + touch via Pointer Events). Hit-testing uses
 * elementFromPoint so a finger sliding across tiles selects reliably (touch does
 * not emit pointerenter on siblings once capture starts). Draws an SVG connector
 * between selected tile centres.
 */
export function Board({ board, onSubmit, flash }: Props) {
  const rows = board.length;
  const cols = board[0].length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [path, setPath] = useState<Cell[]>([]);
  const [tracing, setTracing] = useState(false);
  const [centers, setCenters] = useState<{ x: number; y: number }[]>([]);

  const cellFromPoint = useCallback((x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const tile = el?.closest('[data-cell]') as HTMLElement | null;
    if (!tile) return null;
    const r = Number(tile.dataset.r);
    const c = Number(tile.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return [r, c];
  }, []);

  // Recompute connector coordinates whenever the path changes.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || path.length === 0) { setCenters([]); return; }
    const wb = wrap.getBoundingClientRect();
    setCenters(path.map(([r, c]) => {
      const t = tileRefs.current[r * cols + c];
      if (!t) return { x: 0, y: 0 };
      const b = t.getBoundingClientRect();
      return { x: b.left - wb.left + b.width / 2, y: b.top - wb.top + b.height / 2 };
    }));
  }, [path, cols]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setTracing(true);
    setPath([cell]);
  }, [cellFromPoint]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!tracing) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    setPath((p) => extendPath(p, cell));
  }, [tracing, cellFromPoint]);

  const endTrace = useCallback(() => {
    if (!tracing) return;
    setTracing(false);
    setPath((p) => {
      if (p.length > 0) onSubmit(pathToWord(board, p));
      return [];
    });
  }, [tracing, board, onSubmit]);

  const inPath = (r: number, c: number) => path.some(([pr, pc]) => pr === r && pc === c);
  const word = pathToWord(board, path);
  const flashCls = flash ? ` flash-${flash.type}` : '';

  return (
    <div className="board-wrap">
      <div className={`current-word${word ? ' show' : ''}`} aria-live="polite">{word || ' '}</div>
      <div
        ref={wrapRef}
        className={`board${flashCls}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endTrace}
        onPointerCancel={endTrace}
        key={flash?.id ?? 'noflash'}
      >
        <svg className="connector" aria-hidden="true">
          {centers.length > 1 && (
            <polyline
              points={centers.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--lime)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}
        </svg>
        {board.map((row, r) =>
          row.map((ch, c) => (
            <div
              key={`${r}-${c}`}
              data-cell
              data-r={r}
              data-c={c}
              ref={(el) => { tileRefs.current[r * cols + c] = el; }}
              className={`tile${inPath(r, c) ? ' sel' : ''}`}
            >
              <span>{ch}</span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
