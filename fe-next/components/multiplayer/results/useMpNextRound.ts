'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import logger from '@/utils/logger';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { DIFFICULTIES } from '@/utils/consts';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { INTERSTITIAL_MAX_WAIT_MS } from '@/hooks/useAdMob';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { Language } from '@/shared/types/game';

type Grid = string[][];

/** Slack on top of the interstitial's own worst case, so the cover always outlives the ad teardown. */
const OVERLAY_RELEASE_MARGIN_MS = 5000;
/** resetGame ack timeout before we try startGame anyway (socket hiccup). */
const RESET_ACK_TIMEOUT_MS = 3000;

interface Options {
  socket: Socket | null;
  isHost: boolean;
  gameCode?: string;
  roomLanguage: Language;
  selectedGameMode: GameModeOption;
}

function buildGrid(roomLanguage: Language): Grid {
  const cfg = DIFFICULTIES.MEDIUM;
  return pickRichestBoardClient(() => generateRandomTable(cfg.rows, cfg.cols, roomLanguage, []), roomLanguage);
}

/**
 * The host's "next round" action from results (moved from ResultsPage).
 *
 * - The next board is pre-generated AFTER first paint (idle), so results paint
 *   instantly and a rematch has zero delay.
 * - The interstitial is awaited BEFORE `startGame`, so the other players stay
 *   on results while the host watches an ad (they'd otherwise drop into the
 *   next round alone). It resolves immediately when no ad is served.
 * - `resetGame` first (ack), then `startGame`; a 3s guard starts anyway.
 * - `isStartingNextRound` holds a brand wash over the ad-teardown / socket gap,
 *   released after the interstitial's own worst case (never a second number).
 */
export function useMpNextRound({ socket, isHost, gameCode, roomLanguage, selectedGameMode }: Options) {
  const { showInterstitial } = useInterstitialAd();
  const [isStartingNextRound, setIsStartingNextRound] = useState(false);
  const [preGeneratedGrid, setPreGeneratedGrid] = useState<Grid | null>(null);
  const startGameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(() => setPreGeneratedGrid(buildGrid(roomLanguage)), { timeout: 1500 });
      return () => {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (typeof cic === 'function') cic(id);
      };
    }
    const t = setTimeout(() => setPreGeneratedGrid(buildGrid(roomLanguage)), 0);
    return () => clearTimeout(t);
  }, [roomLanguage]);

  useEffect(() => () => {
    if (startGameTimeoutRef.current) clearTimeout(startGameTimeoutRef.current);
    if (overlayReleaseTimerRef.current) clearTimeout(overlayReleaseTimerRef.current);
  }, []);

  const handleStartGame = useCallback(async () => {
    if (!socket || !isHost) return;
    logger.log('[RESULTS] Host starting new game from results');

    setIsStartingNextRound(true);
    if (overlayReleaseTimerRef.current) clearTimeout(overlayReleaseTimerRef.current);
    overlayReleaseTimerRef.current = setTimeout(
      () => setIsStartingNextRound(false),
      INTERSTITIAL_MAX_WAIT_MS + OVERLAY_RELEASE_MARGIN_MS,
    );

    try {
      await showInterstitial('multiplayer-round-complete');
    } catch (err) {
      logger.debug('[RESULTS] showInterstitial threw — continuing', err);
    }

    const gridForGame = preGeneratedGrid ?? buildGrid(roomLanguage);
    const startPayload = {
      letterGrid: gridForGame,
      language: roomLanguage,
      hostPlaying: true,
      boardTheme: null,
      gameMode: selectedGameMode,
    };

    let callbackFired = false;
    startGameTimeoutRef.current = setTimeout(() => {
      if (!callbackFired) {
        logger.debug('[RESULTS] resetGame callback timed out — attempting startGame anyway');
        socket.emit('startGame', startPayload);
      }
    }, RESET_ACK_TIMEOUT_MS);

    // gameCode rides along for mobile reconnects where the socket mapping may be stale.
    socket.emit('resetGame', { gameCode }, (response: { success: boolean; error?: string }) => {
      callbackFired = true;
      if (startGameTimeoutRef.current) clearTimeout(startGameTimeoutRef.current);
      if (response?.success) {
        socket.emit('startGame', startPayload);
      } else {
        logger.debug('[RESULTS] Game reset failed:', response?.error);
      }
    });
  }, [socket, isHost, roomLanguage, selectedGameMode, preGeneratedGrid, gameCode, showInterstitial]);

  return { handleStartGame, isStartingNextRound };
}
