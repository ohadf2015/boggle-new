'use client';

import React from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { QuickReactions, FloatingReaction } from '@/components/game/QuickReactions';

interface LobbyReactionsProps {
  /** Local player's display name — stamped on the floating emoji. */
  username: string;
  /** Layout of the trigger/tray (bar = mobile row, vertical = desktop column). */
  layout?: 'bar' | 'vertical';
  /**
   * Display-only mode for the shared screen (TV / host): show incoming emoji
   * floating over the lobby, but hide the send tray (nobody taps the TV). The
   * socket listener still mounts, so the host receives every player's reaction.
   */
  receiveOnly?: boolean;
  className?: string;
}

/**
 * Lobby social toy — lets players waiting for the host fling emoji reactions at
 * the room, so the pre-game wait isn't dead air.
 *
 * Deliberately tiny: it REUSES the existing `quickReaction` socket event (no
 * gameState gate → already works while `waiting`, no new backend game-loop) and
 * the same `useQuickReactions` hook + reaction components the results screen
 * uses. Pure ambient delight — no scoring, no win condition, and it never gates
 * or competes with the host pressing Start.
 */
export function LobbyReactions({ username, layout = 'bar', receiveOnly = false, className }: LobbyReactionsProps): React.ReactElement {
  const { socket } = useSocket();
  const { floatingReactions, sendReaction, dismissReaction } = useQuickReactions({ socket, username });

  return (
    <>
      {/* Floating emojis drift up over the whole lobby (viewport-relative %). */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true" data-testid="lobby-reactions-overlay">
        {floatingReactions.map((r) => (
          <FloatingReaction
            key={r.id}
            id={r.id}
            emoji={r.emoji}
            username={r.username}
            x={r.x}
            y={r.y}
            onComplete={dismissReaction}
          />
        ))}
      </div>
      {!receiveOnly && <QuickReactions onReaction={sendReaction} layout={layout} className={className} />}
    </>
  );
}

export default LobbyReactions;
