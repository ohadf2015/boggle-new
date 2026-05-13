'use client';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { AlmostWord } from '@/lib/blast/v2/engine';
import styles from './BlastAlmostGhost.module.css';

type Props = {
  almosts: AlmostWord[];
  hidden?: boolean;
  modeColor?: string;
  /**
   * Board container ref. When provided, ghost positions are measured from the
   * actual `[data-col]` column wrappers — robust to layout changes (gap, padding,
   * tile-size). Falls back to CSS-variable positioning when ref is absent
   * (test-only path; jsdom returns 0-sized rects).
   */
  boardRef?: RefObject<HTMLElement | null>;
};

type Pos = { left: number; bottom: number; width: number; height: number };

function measurePosition(boardEl: HTMLElement, col: number, row: number): Pos | null {
  const colEl = boardEl.querySelector<HTMLElement>(`[data-col="${col}"]`);
  if (!colEl) return null;
  const colRect = colEl.getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  // Tile dims: use the first existing tile in the column for accurate size + gap.
  const tile = colEl.querySelector<HTMLElement>('[data-cell-id]');
  if (!tile) return null;
  const tileRect = tile.getBoundingClientRect();
  const tileSize = tileRect.height;
  const gap = parseFloat(getComputedStyle(colEl).rowGap || getComputedStyle(colEl).gap || '0') || 8;
  return {
    left: colRect.left - boardRect.left,
    bottom: row * (tileSize + gap),
    width: colRect.width,
    height: tileSize,
  };
}

export function BlastAlmostGhost({ almosts, hidden, modeColor = '#ec4899', boardRef }: Props) {
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const lastAlmostsRef = useRef(almosts);

  useLayoutEffect(() => {
    const board = boardRef?.current;
    if (!board) return;
    const next: Record<string, Pos> = {};
    for (const a of almosts) {
      const pos = measurePosition(board, a.gapCell.col, a.gapCell.row);
      if (pos) next[`${a.word}-${a.gapCell.col}-${a.gapCell.row}`] = pos;
    }
    setPositions(next);
    lastAlmostsRef.current = almosts;
  }, [almosts, boardRef]);

  if (hidden || almosts.length === 0) return null;
  const useMeasured = !!boardRef?.current && Object.keys(positions).length > 0;
  return (
    <div className={styles.layer} data-testid="blast-almost-layer" aria-hidden>
      {almosts.map((a) => {
        const key = `${a.word}-${a.gapCell.col}-${a.gapCell.row}`;
        const measured = positions[key];
        const inlineStyle: React.CSSProperties = useMeasured && measured
          ? {
              color: modeColor,
              left: measured.left,
              bottom: measured.bottom,
              width: measured.width,
              height: measured.height,
            }
          : {
              color: modeColor,
              ['--ghost-col' as string]: a.gapCell.col,
              ['--ghost-row' as string]: a.gapCell.row,
            };
        return (
          <span
            key={key}
            data-almost-ghost={a.word}
            data-target-col={a.gapCell.col}
            data-target-row={a.gapCell.row}
            className={styles.ghost}
            style={inlineStyle}
          >
            {a.neededLetter}
          </span>
        );
      })}
    </div>
  );
}
