'use client';

import { memo } from 'react';
import type { Socket } from 'socket.io-client';
import { OpponentWordFeed } from './OpponentWordFeed';
import { useOpponentWordFeed } from '@/hooks/useOpponentWordFeed';

interface Props {
  socket: Socket | null;
  currentPlayerName: string;
  t: (key: string, params?: Record<string, any>) => string;
}

/**
 * Self-contained wrapper around OpponentWordFeed. Owning the
 * `useOpponentWordFeed` subscription here (rather than in MultiplayerInGameView)
 * isolates opponent-word socket events from the game shell — they no longer
 * trigger parent re-renders that overlapped with drag-selection rendering.
 */
export const OpponentWordFeedConnected = memo<Props>(function OpponentWordFeedConnected({
  socket,
  currentPlayerName,
  t,
}) {
  const { feedItems } = useOpponentWordFeed({ socket, currentPlayerName });
  return <OpponentWordFeed feedItems={feedItems} t={t} />;
});
