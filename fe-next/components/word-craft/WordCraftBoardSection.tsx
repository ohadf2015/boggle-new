'use client';

import { useMemo, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
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
  /** Tap a pending (not-yet-submitted) tile on the board to send it back to the rack. */
  onRecallPending?(rackTileId: string): void;
  onSceneCtx(ctx: SceneCtx): void;
  dragHoverCell?: string | null;
  isFirstMove?: boolean;
  isDisabled?: boolean;
  locale?: string;
  reticle?: { row: number; col: number } | null;
  zoomLabel?: string;
  zoomResetLabel?: string;
  /** golden_tiles modifier: true for tile ids that ring-capture on commit. */
  isGolden?: (tileId: string) => boolean;
}

export function WordCraftBoardSection(props: Props) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  // Hydration-safe reduced-motion (false on SSR + first client render, synced
  // post-mount) — was an inline useState(matchMedia) that diverged from SSR (#418).
  const rm = usePrefersReducedMotion();

  // Cells the zoom shell should follow: the active word's pending tiles, or
  // the centre star on an empty first-move board so play opens zoomed-in.
  const focusCells = useMemo(() => {
    if (props.pending.length > 0) {
      return props.pending.map((p) => ({ row: p.row, col: p.col }));
    }
    if (props.isFirstMove) {
      const c = Math.floor(props.board.size / 2);
      return [{ row: c, col: c }];
    }
    return [];
  }, [props.pending, props.isFirstMove, props.board.size]);

  return (
    <WordCraftZoomShell
      ariaLabel={props.zoomLabel}
      resetLabel={props.zoomResetLabel}
      focusCells={focusCells}
      boardSize={props.board.size}
    >
      <div
        ref={boardRef}
        className="relative w-full h-full"
        style={{ containerType: 'inline-size' }}
      >
        <WordCraftBoard
          board={props.board}
          pendingPlacements={props.pending}
          onCellClick={(r, c) => props.onCellTap({ row: r, col: c })}
          onRecallPending={props.onRecallPending}
          disabled={props.isDisabled}
          hasSelectedTile={!!props.selectedRackTile}
          isFirstMove={props.isFirstMove}
          dragHoverCell={props.dragHoverCell}
          locale={props.locale}
          reticle={props.reticle}
          isGolden={props.isGolden}
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
