'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './MiniGrid.module.css';

interface MiniGridCellProps {
  cellKey: string;
  letter: string;
  /** 1-based trace order when selected, otherwise null. */
  order: number | null;
  isHint: boolean;
  isFlashing: boolean;
  /** Show the bobbing "Start here" pointer above this cell. */
  showStartHint: boolean;
  startHereLabel: string;
}

/**
 * One board tile. Pointer input is handled by the parent grid (cells are
 * pointer-events-none); this only paints state. Motion is CSS-only
 * (MiniGrid.module.css) and switches off under prefers-reduced-motion.
 */
const MiniGridCell: React.FC<MiniGridCellProps> = ({
  cellKey,
  letter,
  order,
  isHint,
  isFlashing,
  showStartHint,
  startHereLabel,
}) => {
  const isSel = order !== null;
  return (
    <div
      data-testid={`mini-grid-cell-${cellKey}`}
      data-selected={isSel ? 'true' : 'false'}
      data-hint={isHint ? 'true' : 'false'}
      className={cn(
        'relative aspect-square rounded-neo border-3',
        'flex items-center justify-center font-black text-3xl sm:text-4xl',
        'pointer-events-none cursor-grab active:cursor-grabbing',
        styles.tile,
        isSel
          ? cn('bg-neo-lime border-neo-black text-neo-black', styles.tileSelected)
          : 'letter-tile-gradient-cream border-neo-black text-neo-black shadow-hard-sm',
        isHint && cn('border-neo-yellow ring-2 ring-neo-yellow/60', styles.tileHint),
        isFlashing && 'bg-neo-lime/80'
      )}
    >
      {/* Glow ring when selected */}
      {isSel && (
        <div
          aria-hidden
          className={cn('absolute inset-[-4px] rounded-neo border-2 border-neo-lime/40 opacity-60', styles.glow)}
          style={{ boxShadow: '0 0 16px rgba(132,204,22,0.5), inset 0 0 8px rgba(132,204,22,0.2)' }}
        />
      )}

      <span className={cn('relative z-10', isSel && styles.letterPop)}>{letter}</span>

      {/* Selection order badge */}
      {isSel && (
        <div
          className={cn(
            'absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow text-[11px] font-black shadow-hard-sm pointer-events-none',
            styles.badge
          )}
        >
          {order}
        </div>
      )}

      {/* Bobbing "Start here" pointer. The bob lives on the inner node so it
          never fights the outer -translate-x-1/2 centering transform. */}
      {showStartHint && (
        <div className="absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap pointer-events-none">
          <div className={styles.bob}>
            <div className="flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-yellow px-2.5 py-1 text-[10px] font-black text-neo-black shadow-hard-sm">
              <Sparkles className="h-3 w-3" />
              {startHereLabel}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-neo-black bg-neo-yellow" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniGridCell;
