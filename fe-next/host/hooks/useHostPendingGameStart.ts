'use client';

/**
 * The startGame that reached the page while HostView was unmounted (results
 * screen → next round, or a reload mid-round). Split out of
 * useHostRoundLifecycle.
 */

import { useEffect } from 'react';
import { stashStartGameMessageId, wasStartGameHandled, markStartGameHandled, replayStartGame } from '@/shared/utils/gameEventUtils';
import type { useHostViewState } from './useHostViewState';
import type { GameStartData } from '../hostViewTypes';

type HostState = ReturnType<typeof useHostViewState>;

export interface HostPendingGameStartInput {
  pendingGameStart?: GameStartData | null;
  onGameStartConsumed?: () => void;
  state: Pick<HostState,
    | 'setTableData' | 'setRemainingTime' | 'setWaitingForResults' | 'setShowStartAnimation'
    | 'setPlayerWordCounts' | 'setPlayerScores' | 'setHostFoundWords' | 'setHostAchievements' | 'setFinalScores'>;
  onRoundMusic: () => void;
}

export function useHostPendingGameStart({
  pendingGameStart, onGameStartConsumed, state, onRoundMusic,
}: HostPendingGameStartInput): void {
  useEffect(() => {
    if (!pendingGameStart) return;

    // Skip if useHostGameEvents.handleStartGame already drove the start for
    // this messageId — both handlers run for a normal start, and double
    // setShowStartAnimation(true) makes GoRipples unmount/remount and play
    // the countdown twice.
    if (wasStartGameHandled('HOST', pendingGameStart.messageId)) {
      onGameStartConsumed?.();
      return;
    }

    if (replayStartGame('HOST', pendingGameStart)) {
      if (!pendingGameStart.reconnect) state.setFinalScores(null);
      onGameStartConsumed?.();
      return;
    }

    if (pendingGameStart.letterGrid) {
      state.setTableData(pendingGameStart.letterGrid);
    }
    if (pendingGameStart.timerSeconds !== undefined) {
      state.setRemainingTime(pendingGameStart.timerSeconds);
    }

    // Stash so the GoRipplesAnimation can emit `countdownComplete` once it
    // finishes — server gates the round timer on that signal.
    if (pendingGameStart.messageId) {
      stashStartGameMessageId('HOST', pendingGameStart.messageId);
      markStartGameHandled('HOST', pendingGameStart.messageId);
    }

    state.setWaitingForResults(false);
    state.setShowStartAnimation(true);
    state.setPlayerWordCounts({});
    state.setPlayerScores({});
    state.setHostFoundWords([]);
    state.setHostAchievements([]);
    state.setFinalScores(null);

    onRoundMusic();
    onGameStartConsumed?.();
  }, [pendingGameStart, onGameStartConsumed, state, onRoundMusic]);
}
