'use client';

import { memo, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { OpponentInsightFeed, type OpponentWord } from './OpponentInsightFeed';
import { useOpponentWordFeed } from '@/hooks/useOpponentWordFeed';
import type { MpDesktopMode } from '../types';

interface Props {
  socket: Socket | null;
  currentPlayerName: string;
  mode: MpDesktopMode;
  maxItems?: number;
}

/**
 * Self-contained wrapper around OpponentInsightFeed. The shell-mode insight
 * panel subscribes here instead of having the parent (MultiplayerInGameView)
 * hold opponent-word state. This keeps the drag-selection render path clear
 * of incidental re-renders triggered by `opponentWordFound` socket events.
 */
export const OpponentInsightFeedConnected = memo<Props>(function OpponentInsightFeedConnected({
  socket,
  currentPlayerName,
  mode,
  maxItems,
}) {
  const { feedItems } = useOpponentWordFeed({ socket, currentPlayerName });
  const opponentWords = useMemo<OpponentWord[]>(
    () =>
      feedItems.map((item) => ({
        wordLength: item.wordLength,
        firstLetter: item.firstLetter,
        lastLetter: item.lastLetter,
        score: item.score,
        ts: item.timestamp,
        byUsername: item.playerName,
      })),
    [feedItems],
  );
  if (opponentWords.length === 0) return null;
  return <OpponentInsightFeed mode={mode} opponentWords={opponentWords} maxItems={maxItems} />;
});
