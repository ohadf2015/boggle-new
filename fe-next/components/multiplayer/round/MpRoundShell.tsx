'use client';

import type { ReactNode } from 'react';
import { MpDesktopShellFrame } from '../desktop/MpDesktopShellFrame';
import { MpRoundLayout, type MpRoundLayoutProps } from './MpRoundLayout';

/** Round-frame modes: the canvas runs with its own chrome off (`mpChrome`; blast via MpBlastCanvas). */
export const ROUND_FRAME_MODES = ['classic', 'word-hunt', 'blast'] as const;

export function isRoundFrameMode(mode: string | null | undefined): boolean {
  // An unconfirmed/legacy null mode renders the classic board.
  return !mode || (ROUND_FRAME_MODES as readonly string[]).includes(mode);
}

export interface MpRoundShellProps extends Omit<MpRoundLayoutProps, 'canvas'> {
  canvas: ReactNode;
  /** `useDesktopShellEnabled()` — the kill-switched desktop gate. */
  desktopShell: boolean;
  roomId: string;
}

/**
 * The one round frame for host and joiner. Phone and desktop render the SAME
 * MpRoundLayout (CSS decides the columns); on desktop it sits inside the
 * shell marker so the `mp.desktop-shell.v1` gate still governs it.
 */
export function MpRoundShell({ desktopShell, roomId, canvas, ...round }: MpRoundShellProps) {
  const gameMode = round.gameMode ?? 'classic';
  if (desktopShell) {
    return (
      <MpDesktopShellFrame
        gameMode={gameMode}
        canvas={canvas}
        leaderboard={round.leaderboard as never}
        users={round.users as never}
        foundWords={round.foundWords as never}
        meId={round.meId}
        roomId={roomId}
        remainingTime={round.remainingTime}
        totalTime={round.totalTime}
        round={round}
      />
    );
  }
  return <MpRoundLayout {...round} canvas={canvas} />;
}
