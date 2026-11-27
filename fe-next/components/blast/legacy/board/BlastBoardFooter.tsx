'use client';

import type { ReactNode } from 'react';
import { BlastTileFirstUseCallout } from '../BlastTileFirstUseCallout';
import type { BlastTileType } from '../types';

interface BlastBoardFooterProps {
  teaching: BlastTileType | null;
  onDismissTeaching: () => void;
  isMultiplayer?: boolean;
  /** A word is being traced or its verdict is showing: the pill owns the slot. */
  busy?: boolean;
  children: ReactNode;
}

/** The slot under the board: the power-tile card while it teaches and no word is in play, otherwise the word pill. */
export function BlastBoardFooter({ teaching, onDismissTeaching, isMultiplayer, busy = false, children }: BlastBoardFooterProps) {
  return teaching && !busy ? (
    <BlastTileFirstUseCallout type={teaching} onDismiss={onDismissTeaching} isMultiplayer={isMultiplayer} />
  ) : (
    <>{children}</>
  );
}
