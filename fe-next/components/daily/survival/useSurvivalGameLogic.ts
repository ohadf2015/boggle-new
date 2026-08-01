'use client';

import { useCallback, useEffect, useRef, useReducer } from 'react';
import type { LetterGrid, Language } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import { calculateEfficiencyScore, type ClueShopItem, type HintLevel } from '@/utils/aiHintGenerator';
import type { FeedbackType } from '../WordFeedbackToast';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { WordDiscovery, TargetAttempt, SurvivalGameResult, AccumulatedClue, ScoreEvent, AutoClueNotificationData } from './types';
import { useLiveScoreTracker } from './useLiveScoreTracker';
import { clearRejectedWords } from '@/utils/invalidWordTracker';
import {
  LIFE_DRAIN_RATE,
  NEW_PLAYER_LIFE_DRAIN_RATE,
  NEW_PLAYER_THRESHOLD,
  NEW_PLAYER_LIFE_FLOOR,
  getLanguageDrainMultiplier,
} from './constants';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { logGameStart, logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import { isNewDailyPlayer, incrementDailyChallengesCompleted } from '@/utils/trainingProgressStorage';
import { useSurvivalClues } from './useSurvivalClues';
import { useSurvivalHints } from './useSurvivalHints';
import { survivalGameReducer, createInitialState } from './survivalGameReducer';
import { useSafeTimeout, useSafeInterval } from '@/hooks/useSafeTimeout';
import { useSurvivalWordSubmission } from './useSurvivalWordSubmission';
import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';

export interface UseSurvivalGameLogicProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  t: (key: string) => string;
  deferGameOver?: boolean;
  /**
   * Practice-mode opt-out: when true the life-drain interval is suppressed so the
   * player never loses life. Score still increments, words still register —
   * just no time pressure. Pairs with `?practice=1` URL flag.
   */
  disableLifeDrain?: boolean;
}

export interface SurvivalGameState {
  // Life state
  lifePoints: number;
  isGameOver: boolean;
  hasWon: boolean;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;

  // Word discovery
  discoveredWords: WordDiscovery[];
  clueTokens: number;
  tokensSpent: number;

  // Target attempts
  attempts: TargetAttempt[];
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;

  // Hints and clues
  currentHint: HintLevel | null;
  category: string;
  exampleSentence: string;
  revealedLetters: Set<number>;
  eliminatedLetters: Set<string>;
  knownLetters: Set<string>;
  accumulatedClues: Map<number, AccumulatedClue>;
  showCategory: boolean;
  showExample: boolean;
  hintStage: number;
  nextHintItem: ClueShopItem | null;

  // Score tracking (new)
  liveScore: number;
  lastScoreIncrement: number | null;
  isScoreAnimating: boolean;
  scoreHistory: ScoreEvent[];

  // Notifications (new)
  activeNotifications: AutoClueNotificationData[];

  // UI state
  formedWord: string;
  letterCount: number;
  showShop: boolean;
  showShopHint: boolean;
  showQuitConfirm: boolean;
  isClueGaining: boolean;

  // Toast feedback
  feedbackType: FeedbackType | null;
  feedbackMessage: string;
  feedbackWord: string | null;

  // WordFormingArea feedback
  wordFeedback: WordFeedback | null;
}

export interface SurvivalGameActions {
  handleWordSubmit: (word: string) => void;
  handleWordChange: (word: string, count: number) => void;
  handlePurchase: (item: ClueShopItem) => void;
  buyNextHint: () => void;
  showToast: (type: FeedbackType, message: string) => void;
  closeToast: () => void;
  setShowShop: (show: boolean) => void;
  setShowShopHint: (show: boolean) => void;
  setShowQuitConfirm: (show: boolean) => void;
  setLifeGainAmount: (amount: number | null) => void;
  showAutoClueNotification: (clueType: string) => void;
  dismissNotification: (id: string) => void;
  restoreLife: (amount: number) => void;
  gameDir: 'ltr' | 'rtl';
  clueContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useSurvivalGameLogic({
  grid,
  puzzleNumber,
  language,
  targetWord,
  onComplete,
  t,
  deferGameOver = false,
  disableLifeDrain = false,
}: UseSurvivalGameLogicProps): [SurvivalGameState, SurvivalGameActions] {
  const { user } = useAuth();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, TRACKS } = useMusic();

  // Game direction for RTL support
  const gameDir = language === 'he' ? 'rtl' : 'ltr';

  // Consolidated state via reducer
  const [state, dispatch] = useReducer(survivalGameReducer, undefined, createInitialState);

  // Refs
  const clueContainerRef = useRef<HTMLDivElement>(null);
  const gameOverRef = useRef(false);
  const gameStartTimeRef = useRef<number>(0);
  const pendingUnlockRef = useRef<string | null>(null);

  // Timer hooks (replaces manual timer refs)
  const lifeDrainInterval = useSafeInterval();
  const feedbackTimeout = useSafeTimeout();
  const lifeAnimationTimeout = useSafeTimeout();

  // Toast helpers - dispatch-based
  const showToast = useCallback((type: FeedbackType, message: string, word?: string) => {
    dispatch({ type: 'SHOW_TOAST', payload: { type, message, word } });

    // Also dispatch WordFeedback for WordFormingArea
    const wordFeedbackType = type === 'valid-word' || type === 'target-found'
      ? 'accepted' as const
      : type === 'duplicate'
        ? 'duplicate' as const
        : 'rejected' as const;
    const fb: WordFeedback = {
      id: `${Date.now()}`,
      type: wordFeedbackType,
      word: state.formedWord || '',
      message: wordFeedbackType !== 'accepted' ? message : undefined,
      score: wordFeedbackType === 'accepted' ? undefined : undefined,
      timestamp: Date.now(),
    };
    dispatch({ type: 'SET_WORD_FEEDBACK', payload: fb });
  }, [state.formedWord]);

  const closeToast = useCallback(() => {
    dispatch({ type: 'CLOSE_TOAST' });
  }, []);

  // Live score tracking
  const [liveScoreState] = useLiveScoreTracker({
    lifePoints: state.lifePoints,
    clueTokens: state.clueTokens,
    discoveredWords: state.discoveredWords,
    attempts: state.attempts,
    isGameOver: state.isGameOver,
    hasWon: state.hasWon,
  });

  // Notification actions
  const showAutoClueNotification = useCallback((clueType: string) => {
    const notification: AutoClueNotificationData = {
      id: `${Date.now()}-${clueType}`,
      clueType: clueType as 'reveal_letter' | 'reveal_category' | 'example_sentence',
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_NOTIFICATION', payload: { id } });
  }, []);

  // Use extracted clue hook
  const [clueState, clueActions] = useSurvivalClues({
    targetWord,
    clueContainerRef,
  });

  // Use extracted hint hook
  const [hintState, hintActions] = useSurvivalHints({
    targetWord,
    language,
    playWordAcceptedSound,
    showToast,
    t,
    accumulatedClues: clueState.accumulatedClues,
  });

  // Callback ref for game over (needed by word submission hook)
  const handleGameOverRef = useRef<((won: boolean, finalAttempts?: TargetAttempt[]) => void) | null>(null);

  // Enable sound effects
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Initialize game start time
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
    // Round boundary: drop the previous round's appealable rejections so the results
    // screen never offers words from a game the player already finished
    // (rules/60-recurring-pitfalls Class 2 — stale mutable state across rounds).
    clearRejectedWords();
  }, []);

  // Funnel parity: emit game_started once on mount to pair with trackGameEnd('survival', ...)
  useEffect(() => {
    trackGameStart('survival', { puzzleNumber, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log game session start
  useEffect(() => {
    async function initGameSession() {
      const sessionId = await logGameStart({
        mode: 'daily_challenge',
        language,
        userId: user?.id || null,
        dailyPuzzleNumber: puzzleNumber,
        targetWord,
      });
      if (sessionId) dispatch({ type: 'SET_GAME_SESSION_ID', payload: sessionId });
    }
    initGameSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game music - plays bossa-arcade for fire round automatically
  // Music will auto-unlock on first user interaction and queue until ready
  useGameMusic({
    phase: 'playing',
    remainingTime: null, // No timer in survival mode
    totalTime: 180, // Default time (not used for urgent music)
    isPaused: state.isGameOver,
    enabled: true,
    earthquakeState: 'fire-round', // Always fire-round for survival mode
  });

  // Check if player is new (first 3 daily challenges) - calculated once
  const isNewPlayer = useRef(isNewDailyPlayer(NEW_PLAYER_THRESHOLD));
  const baseDrainRate = isNewPlayer.current ? NEW_PLAYER_LIFE_DRAIN_RATE : LIFE_DRAIN_RATE;
  const drainRate = baseDrainRate * getLanguageDrainMultiplier(language);

  // Life drain effect — suppressed in practice mode (`disableLifeDrain`) so the
  // player can explore the board without time pressure.
  useEffect(() => {
    if (state.isGameOver || disableLifeDrain) {
      lifeDrainInterval.stop();
      return;
    }

    const lifeFloor = isNewPlayer.current ? NEW_PLAYER_LIFE_FLOOR : 0;
    lifeDrainInterval.start(() => {
      dispatch({ type: 'DRAIN_LIFE', payload: { drainRate, lifeFloor } });
    }, 1000);

    return () => {
      lifeDrainInterval.stop();
    };
  }, [state.isGameOver, disableLifeDrain, drainRate, lifeDrainInterval]);

  // Check for life-based game over. While `deferGameOver` is true (e.g. a
  // rewarded-ad extra-life modal is open), suppress the finale so the reducer
  // can be restored via `restoreLife` without the one-shot `gameOverRef`
  // latching on a transient zero.
  useEffect(() => {
    if (state.lifePoints === 0 && !gameOverRef.current && !deferGameOver) {
      handleGameOverRef.current?.(false);
    }
  }, [state.lifePoints, deferGameOver]);

  // Word submission logic (extracted hook)
  const wordSubmission = useSurvivalWordSubmission({
    grid,
    language,
    targetWord,
    t,
    isGameOver: state.isGameOver,
    attempts: state.attempts,
    discoveredWords: state.discoveredWords,
    lifePoints: state.lifePoints,
    dispatch,
    showToast,
    playWordAcceptedSound,
    playWordRejectedSound,
    clueActions,
    feedbackTimeout,
    lifeAnimationTimeout,
    handleGameOverRef,
  });

  // Handle game over
  const handleGameOver = useCallback(async (won: boolean, finalAttempts?: TargetAttempt[]) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    dispatch({ type: 'GAME_OVER', payload: { won } });

    fadeToTrack(TRACKS.BOSSA, 1000, 1500);

    lifeDrainInterval.stop();

    const attemptsToUse = finalAttempts || state.attempts;
    // Only count target attempts (not discovery attempts) for attemptsUsed
    // BUG FIX: Ensure at least 1 attempt for ALL game completions (win or lose)
    // Handles scenarios where player completes without making target guesses:
    // - Auto-win: discovers all letters through word discoveries
    // - Loss: runs out of life before making any target guesses
    // Without this fix, attemptsUsed=0 fails validation and blocks leaderboard submission.
    const rawTargetAttemptsCount = attemptsToUse.filter(a => !a.isDiscovery).length;
    const targetAttemptsCount = Math.max(1, rawTargetAttemptsCount);

    const result: SurvivalGameResult = {
      solved: won,
      attemptsUsed: targetAttemptsCount,
      targetWord,
      attempts: attemptsToUse,
      wordsDiscovered: state.discoveredWords,
      lifeRemaining: state.lifePoints,
      clueTokensEarned: state.clueTokens + hintState.tokensSpent,
      clueTokensSpent: hintState.tokensSpent,
      hintsUnlocked: hintState.currentHint?.level || 0,
      efficiencyScore: calculateEfficiencyScore(
        state.lifePoints,
        state.clueTokens,
        targetAttemptsCount,
        state.discoveredWords.length,
        won
      ),
    };

    if (state.gameSessionId) {
      const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      const wordsFoundFormatted = formatWordsForLogging(
        state.discoveredWords.map(w => w.word),
        state.discoveredWords.map(w => ({
          word: w.word,
          points: w.lifeGained + (w.tokensGained * 10),
          timestamp: w.timestamp,
        }))
      );

      await logGameEnd(state.gameSessionId, {
        score: result.efficiencyScore,
        wordsFound: wordsFoundFormatted,
        durationSeconds,
        completed: true,
        targetFound: won,
        attemptsUsed: targetAttemptsCount,
        lifeRemaining: state.lifePoints,
        lifeGained: state.discoveredWords.reduce((sum, w) => sum + w.lifeGained, 0),
        tokensEarned: state.clueTokens + hintState.tokensSpent,
        tokensSpent: hintState.tokensSpent,
        cluesUsed: hintState.tokensSpent > 0 ? Math.ceil(hintState.tokensSpent / 5) : 0,
      });
    }

    // Track daily challenge completion for new player detection
    incrementDailyChallengesCompleted();

    trackGameEnd(
      'survival',
      result.efficiencyScore,
      state.discoveredWords.length,
      true,
      Math.floor((Date.now() - gameStartTimeRef.current) / 1000),
      { isWinner: won, attemptsUsed: targetAttemptsCount, lifeRemaining: state.lifePoints }
    );

    onComplete(result);
  }, [state.attempts, state.discoveredWords, state.lifePoints, state.clueTokens, state.gameSessionId, hintState.tokensSpent, hintState.currentHint, targetWord, onComplete, lifeDrainInterval, fadeToTrack, TRACKS]);

  // Token adjustment helper for hint purchases
  const adjustTokens = useCallback((delta: number) => {
    dispatch({ type: 'ADJUST_TOKENS', payload: { delta } });
  }, []);

  // Handle purchase wrapper
  const handlePurchase = useCallback((item: ClueShopItem) => {
    const setClueTokens = (updater: number | ((prev: number) => number)) => {
      if (typeof updater === 'function') {
        // For function updates, we need the current value
        adjustTokens(-item.cost);
      } else {
        dispatch({ type: 'ADJUST_TOKENS', payload: { delta: updater - state.clueTokens } });
      }
    };
    const setShowShopCallback = (show: boolean) => dispatch({ type: 'SET_SHOW_SHOP', payload: show });
    hintActions.handlePurchase(item, state.clueTokens, setClueTokens, setShowShopCallback);
  }, [hintActions, state.clueTokens, adjustTokens]);

  const buyNextHint = useCallback(() => {
    const setClueTokens = (updater: number | ((prev: number) => number)) => {
      if (typeof updater === 'function') {
        const nextItem = hintState.nextHintItem;
        if (nextItem) {
          adjustTokens(-nextItem.cost);
        }
      }
    };
    hintActions.buyNextHint(state.clueTokens, setClueTokens);
  }, [hintActions, state.clueTokens, hintState.nextHintItem, adjustTokens]);

  // Cumulative cost threshold consumed by prior auto-unlocks. Tokens are never
  // actually deducted — this ref gates the next unlock so auto-reveal still
  // follows a "save up N tokens per hint" cadence while remaining FREE.
  const autoUnlockConsumedRef = useRef<number>(0);

  // Auto-Unlock Effect: fires when earned tokens cross next tier threshold.
  // Does NOT spend tokens (the notification copy advertises free auto-unlock).
  useEffect(() => {
    const nextItem = hintState.nextHintItem;

    if (!nextItem || pendingUnlockRef.current === nextItem.id) {
      return undefined;
    }

    // Threshold: tokens earned since last unlock must meet next tier cost.
    const threshold = autoUnlockConsumedRef.current + nextItem.cost;
    if (state.clueTokens < threshold) {
      return undefined;
    }

    pendingUnlockRef.current = nextItem.id;

    const timer = setTimeout(() => {
      const revealed = hintActions.autoUnlockNextHint();
      if (revealed) {
        autoUnlockConsumedRef.current += revealed.cost;
        showAutoClueNotification(revealed.id);
      }
      pendingUnlockRef.current = null;
    }, 500);

    return () => {
      clearTimeout(timer);
      if (pendingUnlockRef.current === nextItem.id) {
        pendingUnlockRef.current = null;
      }
    };
  }, [state.clueTokens, hintState.nextHintItem, hintActions, showAutoClueNotification]);

  // Keep callback ref in sync — assign synchronously (not in useEffect)
  // to avoid a one-render lag where the ref holds a stale callback
  handleGameOverRef.current = handleGameOver;

  // UI state setters using dispatch
  const setShowShop = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_SHOP', payload: show });
  }, []);

  const setShowShopHint = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_SHOP_HINT', payload: show });
  }, []);

  const setShowQuitConfirm = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_QUIT_CONFIRM', payload: show });
  }, []);

  const setLifeGainAmount = useCallback((amount: number | null) => {
    dispatch({ type: 'SET_LIFE_GAIN_ANIMATION', payload: { amount, isGaining: amount !== null } });
  }, []);

  const restoreLife = useCallback((amount: number) => {
    dispatch({ type: 'RESTORE_LIFE', payload: { amount } });
  }, []);

  const returnState: SurvivalGameState = {
    lifePoints: state.lifePoints,
    isGameOver: state.isGameOver,
    hasWon: state.hasWon,
    isLifeGaining: state.isLifeGaining,
    lifeGainAmount: state.lifeGainAmount,
    discoveredWords: state.discoveredWords,
    clueTokens: state.clueTokens,
    tokensSpent: hintState.tokensSpent,
    attempts: state.attempts,
    latestAttemptFeedback: state.latestAttemptFeedback,
    showFeedbackOverlay: state.showFeedbackOverlay,
    currentHint: hintState.currentHint,
    category: hintState.category,
    exampleSentence: hintState.exampleSentence,
    revealedLetters: hintState.revealedLetters,
    eliminatedLetters: hintState.eliminatedLetters,
    knownLetters: clueState.knownLetters,
    accumulatedClues: clueState.accumulatedClues,
    showCategory: hintState.showCategory,
    showExample: hintState.showExample,
    hintStage: hintState.hintStage,
    nextHintItem: hintState.nextHintItem,
    liveScore: liveScoreState.currentScore,
    lastScoreIncrement: liveScoreState.lastIncrement,
    isScoreAnimating: liveScoreState.isScoreAnimating,
    scoreHistory: liveScoreState.scoreHistory,
    activeNotifications: state.activeNotifications,
    formedWord: state.formedWord,
    letterCount: state.letterCount,
    showShop: state.showShop,
    showShopHint: state.showShopHint,
    showQuitConfirm: state.showQuitConfirm,
    isClueGaining: clueState.isClueGaining,
    feedbackType: state.feedbackType,
    feedbackMessage: state.feedbackMessage,
    feedbackWord: state.feedbackWord,
    wordFeedback: state.wordFeedback,
  };

  const actions: SurvivalGameActions = {
    handleWordSubmit: wordSubmission.handleWordSubmit,
    handleWordChange: wordSubmission.handleWordChange,
    handlePurchase,
    buyNextHint,
    showToast,
    closeToast,
    setShowShop,
    setShowShopHint,
    setShowQuitConfirm,
    setLifeGainAmount,
    showAutoClueNotification,
    dismissNotification,
    restoreLife,
    gameDir,
    clueContainerRef,
  };

  return [returnState, actions];
}
