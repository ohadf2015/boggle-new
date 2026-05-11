'use client';

import { useEffect, useRef, useState } from 'react';
import { WordCraftBoard } from './WordCraftBoard';
import { WordCraftZoomShell } from './WordCraftZoomShell';
import { WordCraftPixiStage } from './WordCraftPixiStage';
import type { Board } from '@/lib/word-craft/board';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';

interface Props {
  board: Board;
  pending: PlacedTile[];
  selectedRackTile: RackTile | null;
  onCellTap(cell: { row: number; col: number }): void;
  onCellDragOver(cell: { row: number; col: number }): void;
  onCellDrop(cell: { row: number; col: number }): void;
  onSceneCtx(ctx: SceneCtx): void;
  dragHoverCell?: string | null;
  isFirstMove?: boolean;
  isDisabled?: boolean;
  locale?: string;
  reticle?: { row: number; col: number } | null;
  zoomLabel?: string;
  zoomResetLabel?: string;
}

export function WordCraftBoardSection(props: Props) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [rm, setRm] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setRm(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return (
    <WordCraftZoomShell
      ariaLabel={props.zoomLabel}
      resetLabel={props.zoomResetLabel}
    >
      <div
        ref={boardRef}
        className="relative"
        style={{ containerType: 'inline-size' }}
      >
        <WordCraftBoard
          board={props.board}
          pendingPlacements={props.pending}
          onCellClick={(r, c) => props.onCellTap({ row: r, col: c })}
          onRecallPending={(tileId) => {
            // onCellDragOver/onCellDrop are for drag; recall is a separate handler
            // We'll call onRecallPending if it exists, otherwise do nothing
          }}
          disabled={props.isDisabled}
          hasSelectedTile={!!props.selectedRackTile}
          isFirstMove={props.isFirstMove}
          dragHoverCell={props.dragHoverCell}
          locale={props.locale}
          reticle={props.reticle}
        />
        <WordCraftPixiStage
          boardRef={boardRef}
          reducedMotion={rm}
          onReady={props.onSceneCtx}
        />
      </div>
    </WordCraftZoomShell>
  );
}
