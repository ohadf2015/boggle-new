'use client';
import { memo } from 'react';
import { m } from 'framer-motion';
import type { CellId, TileFlag } from '@/lib/blast/v2/types';
import styles from './BlastTile.module.css';

export type BlastTileState = 'normal' | 'selected' | 'just-cleared';

type Props = {
  letter: string;
  cellId: CellId;
  flags: TileFlag[];
  state: BlastTileState;
  modeColor?: string;
  fontStack: string;
  paddingExtra?: number;
  displayChar?: string;
  // Pointer handlers receive this tile's CellId so the parent can pass ONE
  // stable handler for the whole board instead of minting a closure per tile
  // per render (which would defeat the React.memo wrapper below).
  onPointerDown?: (cell: CellId) => void;
  onPointerEnter?: (cell: CellId) => void;
  onPointerUp?: (cell: CellId) => void;
};

function BlastTileImpl({
  letter,
  cellId: id,
  flags,
  state,
  modeColor = '#ec4899',
  fontStack,
  paddingExtra,
  displayChar,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: Props) {
  const frozen = flags.includes('frozen');
  const hasCoin = flags.includes('coin');
  const hasGem = flags.includes('gem');
  const doubleBonus = flags.includes('double_bonus');
  return (
    <m.div
      layout
      data-cell-id={id}
      data-state={state}
      data-state-frozen={frozen ? '' : undefined}
      data-double-bonus={doubleBonus ? '' : undefined}
      data-depth={state === 'selected' ? 'pressed' : 'rest'}
      className={styles.tile}
      style={{
        fontFamily: fontStack,
        padding: 8 + (paddingExtra ?? 0),
        // Tile face (warm rest / pink selected / blue frozen) is owned by
        // BlastTile.module.css. modeColor tints the selected-state accent.
        ['--tile-mode-color' as string]: modeColor,
      }}
      whileTap={{ scale: 0.95 }}
      animate={state === 'selected' ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
      exit={state === 'just-cleared' ? { scale: 0, opacity: 0, rotate: 8 } : undefined}
      onPointerDown={(e) => {
        // Release implicit pointer capture so window-level pointermove
        // can hit-test other tiles during a touch drag.
        const t = e.currentTarget as Element & { releasePointerCapture?: (id: number) => void };
        t.releasePointerCapture?.(e.pointerId);
        onPointerDown?.(id);
      }}
      onPointerEnter={() => onPointerEnter?.(id)}
      onPointerUp={() => onPointerUp?.(id)}
    >
      <span className={styles.letter}>{displayChar ?? letter}</span>
      {hasCoin && <span data-flag="coin" className={styles.coin} />}
      {hasGem && <span data-flag="gem" className={styles.gem} />}
    </m.div>
  );
}

// Memoized: tiles only re-render when their OWN props change (e.g. this tile's
// selection state flips). During a drag the board re-renders on every pointer
// move; without this, all N tiles would re-render each time.
export const BlastTile = memo(BlastTileImpl);
