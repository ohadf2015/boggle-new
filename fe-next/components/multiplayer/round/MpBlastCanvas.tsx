'use client';

import { memo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { useBlastMultiplayerBridge } from '@/components/blast/legacy/hooks/useBlastMultiplayerBridge';
import type { LetterGrid } from '@/shared/types/game';

const BlastGame = dynamic(
  () => import('@/components/blast/legacy/BlastGame').then((m) => ({ default: m.BlastGame })),
  { ssr: false, loading: () => <GameLoadingFallback /> },
);

const noop = () => {};

export interface MpBlastCanvasProps {
  grid: LetterGrid | null;
  username: string;
  socket: Socket | null;
  /** Round length. Any number keeps BlastStage in MP mode; the round HUD owns the live clock. */
  totalTime: number;
  onQuit: () => void;
  onWordWithComboType: (word: string, comboType: string | null) => void;
  onBoardCleared: () => void;
}

/**
 * Blast as the round frame's canvas, for host AND joiner (one path, pitfall
 * class 3). Memoized with no clock and no standings in its props, so a timer
 * tick or a leaderboard update never re-renders the blast board (perf rule 4):
 * the round HUD shows the clock, the roster shows the standings, and the
 * frame's floaters show the SERVER's points (`serverPointsOnly`).
 */
function MpBlastCanvasImpl({ grid, username, socket, totalTime, onQuit, onWordWithComboType, onBoardCleared }: MpBlastCanvasProps) {
  const bridge = useBlastMultiplayerBridge({ letterGrid: grid, gridSize: grid?.[0]?.length ?? 4 });
  const onDeadEnd = useCallback(() => socket?.emit('blastDeadEnd'), [socket]);
  // Loading-gate Retry when the server board never arrived: reuse the existing
  // state-resync path (same emit the timer-stall watchdog uses in
  // usePlayerPhase) — the server re-emits startGame with the current board.
  const onGridRetry = useCallback(() => socket?.emit('requestGameState'), [socket]);
  return (
    <BlastGame
      config={bridge.config}
      mode="multiplayer"
      remainingTime={totalTime}
      totalTime={totalTime}
      username={username}
      onGameEnd={noop}
      onMPDeadEnd={onDeadEnd}
      onMPBoardCleared={onBoardCleared}
      onQuit={onQuit}
      onWordWithComboType={onWordWithComboType}
      initialTileStates={bridge.initialTileStates}
      blastSeed={bridge.blastSeed}
      serverGrid={bridge.serverGrid}
      serverPointsOnly
      isDesktopCanvas
      onGridRetry={onGridRetry}
    />
  );
}

export const MpBlastCanvas = memo(MpBlastCanvasImpl);
MpBlastCanvas.displayName = 'MpBlastCanvas';
