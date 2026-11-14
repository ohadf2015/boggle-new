'use client';

import { useCallback, useState } from 'react';
import type { HandleJoinFn } from './useMultiplayerJoin';

/**
 * Quick Play intent for the host lobby. `?quickPlay=true` covers deep links;
 * the in-page Quick Start button only passes `options.quickPlay` to the join,
 * so remember it when that join hosts a room (PostHog inbox 01a0ed1f-f749).
 * Each later entry join re-derives it, so a normal create clears it.
 */
export function useQuickPlayIntent(handleJoin: HandleJoinFn, urlQuickPlay: boolean) {
  const [hostedQuickPlay, setHostedQuickPlay] = useState(false);

  const wrappedJoin = useCallback<HandleJoinFn>(
    (isHostMode, roomLang, overrideGameCode, overrideRoomName, overrideUsername, options) => {
      setHostedQuickPlay(isHostMode && !!options?.quickPlay);
      return handleJoin(isHostMode, roomLang, overrideGameCode, overrideRoomName, overrideUsername, options);
    },
    [handleJoin],
  );

  return { handleJoin: wrappedJoin, quickPlay: urlQuickPlay || hostedQuickPlay };
}
