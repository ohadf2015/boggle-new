/**
 * Results delivery for the joiner: validatedScores (deduped per session, held
 * for a TV reveal), legacy finalScores, and the request/empty-fallback timeout.
 */
import type { MutableRefObject, RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '@/hooks/gameState';
import type { LetterGrid } from '@/types';
import type { WordToVote } from '@/player/types';
import logger from '@/utils/logger';
import { setMmdChanges } from '@/lib/results/rankedResultStore';
import { createTvRevealGate } from '@/components/education/results/classroomResultsDelivery';
import type { FinalScoresPayload, OnShowResultsData, ValidatedScoresPayload } from './playerGameEventTypes';

export interface PlayerResultsContext {
  socket: Socket;
  username: string;
  gameSessionIdRef: MutableRefObject<number>;
  hasProcessedResultsRef: MutableRefObject<number | null>;
  resultsDisplayedRef: MutableRefObject<number | null>;
  emptyResultsFallbackRef: MutableRefObject<number | null>;
  waitingStartTimeRef: MutableRefObject<number | null>;
  gameActiveRef: MutableRefObject<boolean>;
  letterGridRef: RefObject<LetterGrid | null>;
  onShowResultsRef: RefObject<((data: OnShowResultsData) => void) | undefined>;
  setGameActive: (v: boolean) => void;
  setWaitingForResults: (v: boolean) => void;
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<WordToVote | null>>;
}

export function createPlayerResultsHandlers(ctx: PlayerResultsContext) {
  const {
    socket, username, gameSessionIdRef, hasProcessedResultsRef, resultsDisplayedRef, emptyResultsFallbackRef,
    waitingStartTimeRef, gameActiveRef, letterGridRef, onShowResultsRef, setGameActive, setWaitingForResults,
    setShowWordFeedback, setWordToVote,
  } = ctx;

  // Fallback timeout: if we enter waitingForResults but never get validatedScores,
  // request results from server after 15s. Prevents infinite loading screen.
  let resultsTimeoutId: NodeJS.Timeout | null = null;

  const startResultsTimeout = () => {
    if (resultsTimeoutId) clearTimeout(resultsTimeoutId);
    resultsTimeoutId = setTimeout(() => {
      if (hasProcessedResultsRef.current !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Results timeout — requesting results from server');
        socket.emit('requestResults');
        // Second fallback: force-transition after 5 more seconds
        resultsTimeoutId = setTimeout(() => {
          if (hasProcessedResultsRef.current !== gameSessionIdRef.current) {
            logger.log('[PLAYER] Results fallback — forcing transition with empty results');
            hasProcessedResultsRef.current = gameSessionIdRef.current;
            // Mark this as an EMPTY fallback so a late REAL broadcast can
            // still replace it (see handleValidatedScores dedup guard).
            emptyResultsFallbackRef.current = gameSessionIdRef.current;
            setWaitingForResults(false);
            const currentOnShowResults = onShowResultsRef.current;
            if (currentOnShowResults) {
              currentOnShowResults({ scores: [], letterGrid: null });
            }
          }
        }, 5000);
      }
    }, 15000);
  };

  const showResultsFromData = (data: ValidatedScoresPayload) => {
    // Sync blast stats from server
    if (data.blastSummary) {
      const store = useGameStore.getState();
      if (data.blastSummary.playerStats) {
        store.setBlastPlayerStats(data.blastSummary.playerStats);
        const myStats = data.blastSummary.playerStats[username];
        if (myStats) {
          store.setBlastTotalTilesCleared(myStats.tilesCleared || 0);
          store.setBlastTotalTileBonus(myStats.totalTileBonus || 0);
        }
      }
    }

    // Sync wheel rush stats from server for results screen
    if (data.wheelRushSummary?.playerStats) {
      useGameStore.getState().setWheelRushPlayerStats(data.wheelRushSummary.playerStats);
    }

    // Transition to results
    resultsDisplayedRef.current = gameSessionIdRef.current;
    setGameActive(false);
    gameActiveRef.current = false;
    setWaitingForResults(false);
    setShowWordFeedback(false);
    setWordToVote(null);
    waitingStartTimeRef.current = null;

    const currentOnShowResults = onShowResultsRef.current;
    if (currentOnShowResults) {
      currentOnShowResults({
        scores: data.scores,
        letterGrid: data.letterGrid,
        duplicateRuleDisabled: data.duplicateRuleDisabled,
        playerCount: data.playerCount,
        wordHuntSummary: data.wordHuntSummary,
        blastSummary: data.blastSummary,
        wheelRushSummary: data.wheelRushSummary,
        classroomSummary: data.classroomSummary,
        isRanked: data.isRanked,
        mmrChanges: data.mmrChanges,
      });
    }
  };

  // An arcade TV room waits for the host's reveal; a classroom never does, and
  // the hold survives a socket reconnect. Both rules live in
  // components/education/results/classroomResultsDelivery.
  const tvGate = createTvRevealGate<ValidatedScoresPayload>({
    onShow: showResultsFromData,
    onHold: () => {
      setGameActive(false);
      gameActiveRef.current = false;
      setWaitingForResults(true);
    },
  });

  const handleValidatedScores = (data: ValidatedScoresPayload) => {
    // Deduplicate by game session — prevents processing results twice for the same game.
    // EXCEPTION: if results were only shown via the EMPTY safety fallback, a REAL
    // (non-empty) broadcast for the same session is allowed through so the player is
    // rescued from the stuck empty "Calculating results" screen.
    const sessionId = gameSessionIdRef.current;
    const hasRealScores = Array.isArray(data?.scores) && data.scores.length > 0;
    const supersedesEmptyFallback =
      emptyResultsFallbackRef.current === sessionId && hasRealScores;
    // "Processed" must mean DISPLAYED. A reconnect at the round boundary tore
    // down the held payload, and this guard then swallowed the server's
    // resend — three live classroom rounds, zero results screens (Class 4).
    const neverDisplayed = resultsDisplayedRef.current !== sessionId && hasRealScores;
    if (hasProcessedResultsRef.current === sessionId && !supersedesEmptyFallback && !neverDisplayed) {
      logger.log('[PLAYER] Ignoring duplicate validatedScores - already processed for session', sessionId);
      return;
    }
    hasProcessedResultsRef.current = sessionId;
    // Real results have superseded any prior empty fallback for this session.
    emptyResultsFallbackRef.current = null;

    // Clear the results fallback timeout — we got real results
    if (resultsTimeoutId) { clearTimeout(resultsTimeoutId); resultsTimeoutId = null; }

    logger.log('[PLAYER] Received validatedScores event:', data);

    // Store MMR changes for the results page to display
    if (data.mmrChanges) {
      setMmdChanges(data.mmrChanges);
    }

    tvGate.receive(data);
  };

  const handleFinalScores = (data: FinalScoresPayload) => {
    logger.log('[PLAYER] Received legacy finalScores event:', data);

    // Transition directly to results — no validation modal delay
    setWaitingForResults(false);
    setShowWordFeedback(false);
    setWordToVote(null);
    waitingStartTimeRef.current = null;

    const currentOnShowResults = onShowResultsRef.current;
    if (currentOnShowResults) {
      currentOnShowResults({
        scores: data.scores,
        letterGrid: letterGridRef.current,
      });
    }
  };

  const clearResultsTimeout = () => {
    if (resultsTimeoutId) { clearTimeout(resultsTimeoutId); resultsTimeoutId = null; }
  };

  return { startResultsTimeout, clearResultsTimeout, handleValidatedScores, handleFinalScores, tvGate };
}
