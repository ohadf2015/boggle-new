'use client';
import type React from 'react';
import { motion } from 'framer-motion';
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
  displayChar?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: () => void;
};

export function BlastTile({
  letter,
  cellId: id,
  flags,
  state,
  modeColor = '#ec4899',
  fontStack,
  displayChar,
  onPointerDown,
  onPointerUp,
}: Props) {
  const frozen = flags.includes('frozen');
  const hasCoin = flags.includes('coin');
  const hasGem = flags.includes('gem');
  const doubleBonus = flags.includes('double_bonus');
  return (
    <motion.div
      layout
      data-cell-id={id}
      data-state={state}
      data-state-frozen={frozen ? '' : undefined}
      data-double-bonus={doubleBonus ? '' : undefined}
      className={styles.tile}
      style={{
        fontFamily: fontStack,
        background: frozen ? '#bae6fd' : modeColor,
        opacity: frozen ? 0.6 : 1,
      }}
      animate={state === 'selected' ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
      exit={state === 'just-cleared' ? { scale: 0, opacity: 0, rotate: 8 } : undefined}
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown?.(e);
      }}
      onPointerUp={() => onPointerUp?.()}
    >
      <span className={styles.letter}>{displayChar ?? letter}</span>
      {hasCoin && <span data-flag="coin" className={styles.coin} />}
      {hasGem && <span data-flag="gem" className={styles.gem} />}
    </motion.div>
  );
}
