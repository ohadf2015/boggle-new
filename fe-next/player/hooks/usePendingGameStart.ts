'use client';

/**
 * The results-screen → next-round handoff for a joiner: when PlayerView mounts
 * with a `pendingGameStart` captured at page level, restore the board/timer
 * (reconnect) or drive the full start (store sync, ack, reveal). Split out of
 * PlayerView (FOUNDATION 2026-09-26); the effect moved verbatim.
 */

import { useEffect, type MutableRefObject } from 'react';
import { useSocket } from '@/utils/SocketContext';
import logger from '@/utils/logger';

import { stashStartGameMessageId, wasStartGameHandled, markStartGameHandled, replayStartGame } from '@/shared/utils/gameEventUtils';
import { useGameActions, useGameStore } from '@/hooks/gameState';

import type { PlayerViewProps } from '../types';

export interface PendingGameStartInput {
  pendingGameStart: PlayerViewProps['pendingGameStart'];
  socket: ReturnType<typeof useSocket>['socket'];
  onGameStartConsumed: PlayerViewProps['onGameStartConsumed'];
  handleGameStartMusic: () => void;
  timerReset: () => void;
  timerSetTime: (seconds: number) => void;
  setFoundWords: ReturnType<typeof useGameActions>['setFoundWords'];
  setLetterGrid: ReturnType<typeof useGameActions>['setLetterGrid'];
  setMinWordLength: (n: number) => void;
  setShowModeReveal: (v: boolean) => void;
  setShowStartAnimation: (v: boolean) => void;
  pendingMessageIdRef: MutableRefObject<string | null>;
  revealedMessageIdRef: MutableRefObject<string | null>;
  totalGameTimeRef: MutableRefObject<number>;
}

export function usePendingGameStart({
  pendingGameStart, socket, onGameStartConsumed, handleGameStartMusic, timerReset, timerSetTime,
  setFoundWords, setLetterGrid, setMinWordLength, setShowModeReveal, setShowStartAnimation,
  pendingMessageIdRef, revealedMessageIdRef, totalGameTimeRef,
}: PendingGameStartInput): void {
  // Handle pending game start
  useEffect(() => {
    if (!pendingGameStart || !socket || !onGameStartConsumed) {
      return;
    }

    // A normal game start is also processed by usePlayerGameEvents.handleStartGame
    // (the socket listener), which does the store/timer/ack work and marks the
    // messageId. When that already ran, this effect only drives the PlayerView-
    // local reveal sequence — skip the redundant store setState, timer reset,
    // and startGameAck. The effect stays the sole handler only when the socket
    // listener is unmounted (player sitting on the results screen).
    if (wasStartGameHandled('PLAYER', pendingGameStart.messageId)) {
      const handledIsReconnect = !!(pendingGameStart as any).reconnect;
      if (!handledIsReconnect) {
        if (pendingGameStart.messageId) {
          pendingMessageIdRef.current = pendingGameStart.messageId;
        }
        // Skip if we've already driven the reveal for this messageId — server
        // retries startGame for unacked clients with the SAME id, and re-firing
        // setShowModeReveal(true) makes the countdown play a second time.
        if (revealedMessageIdRef.current !== (pendingGameStart.messageId ?? null)) {
          revealedMessageIdRef.current = pendingGameStart.messageId ?? null;
          setShowModeReveal(true);
        }
      }
      onGameStartConsumed();
      return;
    }

    const isReconnect = !!(pendingGameStart as any).reconnect;
    logger.log('[PLAYER] Processing pending game start:', isReconnect ? '(reconnect)' : '(new game)');

    if (isReconnect && replayStartGame('PLAYER', pendingGameStart)) {
      onGameStartConsumed();
      return;
    }

    // On reconnect, only restore grid/timer — do NOT reset words, replay animations, or re-ACK.
    // This prevents the "game restarted" visual glitch on brief network blips.
    if (isReconnect) {
      logger.log('[PLAYER] Reconnect restore — restoring grid and timer only');
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) {
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
        timerSetTime(pendingGameStart.timerSeconds);
      }
      setMinWordLength(pendingGameStart.minWordLength ?? 2);
      // Reassert the authoritative language in the store on reconnect (in-game
      // validation reads the store via resolvedGameLanguage, not a local).
      if (pendingGameStart.language) useGameStore.setState({ gameLanguage: pendingGameStart.language });
      onGameStartConsumed();
      return;
    }

    setFoundWords([]);

    // Sync Zustand store with game start data.
    // When a non-ready player is on the results screen, usePlayerGameEvents isn't mounted
    // so its handleStartGame listener misses the startGame socket event.
    // This ensures all store fields are set regardless of mount timing.
    const data = pendingGameStart as any;
    const storeUpdates: Record<string, any> = {
      foundWords: [],
      achievements: [],
      showStartAnimation: !data.lateJoin,
    };
    if (data.letterGrid) storeUpdates.letterGrid = data.letterGrid;
    if (data.timerSeconds) {
      storeUpdates.remainingTime = data.timerSeconds;
      storeUpdates.gameDuration = data.timerSeconds;
    }
    if (data.language) storeUpdates.gameLanguage = data.language;
    storeUpdates.minWordLength = data.minWordLength ?? 2;
    if (data.boardTheme) storeUpdates.boardTheme = data.boardTheme;
    if (data.gameMode) {
      // Authoritative server mode (results-screen → next-round path, where
      // usePlayerGameEvents' listener isn't mounted). Confirm atomically so the
      // in-game view never renders a stale mode from the round that just ended.
      storeUpdates.gameMode = data.gameMode;
      storeUpdates.gameModeConfirmed = true;
    }
    if (data.blastTileOverlay) {
      storeUpdates.blastTileOverlay = data.blastTileOverlay;
      storeUpdates.blastMovesUsed = 0;
      if (data.blastSeed != null) storeUpdates.blastSeed = data.blastSeed;
    }
    if (data.wordHuntTargetLength != null && data.wordHuntTargetLength > 0) {
      storeUpdates.wordHuntTargetLength = data.wordHuntTargetLength;
      storeUpdates.wordHuntTargetCategory = data.wordHuntTargetCategory ?? null;
      storeUpdates.wordHuntMyLife = 100;
      storeUpdates.wordHuntPlayerLives = data.wordHuntPlayerLives || {};
      storeUpdates.wordHuntTargetAttempts = [];
      storeUpdates.wordHuntTargetFound = false;
      storeUpdates.wordHuntTargetFoundBy = null;
      storeUpdates.wordHuntEliminatedPlayers = data.wordHuntEliminatedPlayers || [];
      storeUpdates.wordHuntDiscoveryClues = [];
      storeUpdates.wordHuntKnownLetters = [];
    }
    if (data.lateJoin) {
      storeUpdates.gameActive = true;
    }
    useGameStore.setState(storeUpdates);

    // For late joins, show waiting screen briefly before starting animation
    // This gives visual confirmation that the player successfully joined the room
    const isLateJoin = pendingGameStart.messageId?.startsWith('late-join-');
    const delay = isLateJoin ? 1500 : 0; // 1.5 second delay for late joins to show room code

    // Game language already written to the store above (storeUpdates.gameLanguage);
    // the waiting + in-game views read it via resolvedGameLanguage.

    const startGame = () => {
      // Set game data and start animation
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) {
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
        // Sync timer with pending game start
        timerReset();
        timerSetTime(pendingGameStart.timerSeconds);
      }
      setMinWordLength(pendingGameStart.minWordLength ?? 2);
      // Skip ModeRevealOverlay — mode is already visible in lobby; the splash
      // + GoRipplesAnimation read visually as two countdowns. Go straight to 3-2-1.
      revealedMessageIdRef.current = pendingGameStart.messageId ?? null;
      setShowStartAnimation(true);

      // Trigger music immediately for synchronization
      handleGameStartMusic();

      if (pendingGameStart.messageId) {
        pendingMessageIdRef.current = pendingGameStart.messageId;
        stashStartGameMessageId('PLAYER', pendingGameStart.messageId);
        // Mark handled so usePlayerGameEvents.handleStartGame's dedup guard
        // short-circuits when the socket event arrives — otherwise both
        // handlers set showStartAnimation=true at different times, GoRipples
        // unmounts/remounts, and the player sees the countdown twice.
        markStartGameHandled('PLAYER', pendingGameStart.messageId);
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }

      // Consume AFTER setup so dep change doesn't trigger cleanup that cancels
      // the delayed-start timeout (late-join path).
      onGameStartConsumed();
    };

    if (delay > 0) {
      // Late join - delay to show waiting screen briefly
      const startAnimationTimer = setTimeout(startGame, delay);
      return () => clearTimeout(startAnimationTimer);
    } else {
      // Normal game start - no delay
      startGame();
      return;
    }
  // Same deps as before the split: the extra inputs are PlayerView refs and
  // reveal setters (recreated per render, dispatch-backed) — adding them would
  // re-run the start sequence on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGameStart, socket, onGameStartConsumed, handleGameStartMusic, timerReset, timerSetTime, setFoundWords, setLetterGrid]);
}
