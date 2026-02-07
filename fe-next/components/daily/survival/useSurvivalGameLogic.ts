'use client';

import { useCallback, useEffect, useRef, useReducer } from 'react';
import type { LetterGrid, Language } from '@/types';
import { getLetterFeedback, isTargetWordFound, type LetterFeedback } from '@/utils/wordHuntFeedback';
import { calculateLifeReward, calculateTokenReward, calculateEfficiencyScore, type ClueShopItem, type HintLevel } from '@/utils/aiHintGenerator';
import type { FeedbackType } from '../WordFeedbackToast';
import type { WordDiscovery, TargetAttempt, SurvivalGameResult, AccumulatedClue, ScoreEvent, AutoClueNotificationData } from './types';
import { useLiveScoreTracker } from './useLiveScoreTracker';
import {
  MAX_ATTEMPTS,
  INITIAL_LIFE,
  LIFE_DRAIN_RATE,
  NEW_PLAYER_LIFE_DRAIN_RATE,
  NEW_PLAYER_THRESHOLD,
  INVALID_WORD_PENALTY,
  NOT_IN_DICTIONARY_PENALTY,
  FEEDBACK_OVERLAY_DURATION,
  getLifeBonusForWord,
} from './constants';
import { isWordOnBoard, normalizeWord } from '@/utils/clientWordValidator';
import { MIN_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';
import { formatRewardMessage } from '@/utils/formatRewardMessage';
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
import { recordNotOnBoard, recordNotInDictionary } from '@/utils/invalidWordTracker';

export interface UseSurvivalGameLogicProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  t: (key: string) => string;
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
}: UseSurvivalGameLogicProps): [SurvivalGameState, SurvivalGameActions] {
  const { user } = useAuth();
  const { playWordAcceptedSound, setGameActive } = useSoundEffects();
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
  const showToast = useCallback((type: FeedbackType, message: string) => {
    dispatch({ type: 'SHOW_TOAST', payload: { type, message } });
  }, []);

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
  });

  // Callback refs for circular dependencies
  const handleGameOverRef = useRef<((won: boolean, finalAttempts?: TargetAttempt[]) => void) | null>(null);
  const handleTargetAttemptRef = useRef<((word: string, target: string) => void) | null>(null);
  const handleWordDiscoveryRef = useRef<((word: string) => void) | null>(null);
  const handleDiscoveryFeedbackRef = useRef<((word: string, target: string) => void) | null>(null);

  // Enable sound effects
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Initialize game start time
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
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
  const drainRate = isNewPlayer.current ? NEW_PLAYER_LIFE_DRAIN_RATE : LIFE_DRAIN_RATE;

  // Life drain effect
  useEffect(() => {
    if (state.isGameOver) {
      lifeDrainInterval.stop();
      return;
    }

    lifeDrainInterval.start(() => {
      dispatch({ type: 'DRAIN_LIFE', payload: { drainRate } });
    }, 1000);

    return () => {
      lifeDrainInterval.stop();
    };
  }, [state.isGameOver, drainRate, lifeDrainInterval]);

  // Check for life-based game over
  useEffect(() => {
    if (state.lifePoints === 0 && !gameOverRef.current) {
      handleGameOverRef.current?.(false);
    }
  }, [state.lifePoints]);

  // Auto-win when player discovers all green clues
  // This triggers when the player knows the full word through gameplay
  // (NOT from auto-hints, which never reveal the final letter)
  useEffect(() => {
    if (clueState.allPositionsRevealed && !gameOverRef.current) {
      // Player figured out the word - auto-win!
      handleGameOverRef.current?.(true);
    }
  }, [clueState.allPositionsRevealed]);

  // Dictionary validation
  const validateWordInDictionary = useCallback(async (word: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/dictionary/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.toLowerCase(), language }),
      });
      const data = await response.json();
      return data.isValid === true;
    } catch (error) {
      console.error('Dictionary validation error:', error);
      return true;
    }
  }, [language]);

  // Handle word change from grid
  const handleWordChange = useCallback((word: string, count: number) => {
    dispatch({ type: 'SET_FORMED_WORD', payload: { word, count } });
  }, []);

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

    onComplete(result);
  }, [state.attempts, state.discoveredWords, state.lifePoints, state.clueTokens, state.gameSessionId, hintState.tokensSpent, hintState.currentHint, targetWord, onComplete, lifeDrainInterval, fadeToTrack, TRACKS]);

  // Handle target attempt
  const handleTargetAttempt = useCallback((word: string, target: string) => {
    // Use normalized comparison for duplicate check to handle Hebrew final letters
    const normalizedWord = normalizeWord(word, language);
    if (state.attempts.some(a => normalizeWord(a.word, language) === normalizedWord)) {
      showToast('duplicate', t('wordHunt.alreadyGuessed') || 'Already guessed!');
      return;
    }

    // Pass language to enable Hebrew final letter normalization
    const feedback = getLetterFeedback(word, target, language);

    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_ATTEMPT', payload: { attempt: newAttempt } });
    playWordAcceptedSound?.();

    // Update clues from feedback
    const newAttempts = [...state.attempts, newAttempt];
    clueActions.updateCluesFromFeedback(feedback, newAttempts);

    // Show feedback overlay
    feedbackTimeout.clear();
    dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: true, feedback } });

    feedbackTimeout.set(() => {
      dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: false } });
    }, FEEDBACK_OVERLAY_DURATION);

    // Check if correct
    const won = isTargetWordFound(feedback);
    if (won) {
      feedbackTimeout.clear();
      handleGameOverRef.current?.(true, newAttempts);
      return;
    }

    // Wrong guess - penalize
    dispatch({ type: 'ADJUST_LIFE', payload: { delta: -INVALID_WORD_PENALTY } });

    // Check if out of attempts (only count non-discovery attempts)
    const targetAttemptCount = newAttempts.filter(a => !a.isDiscovery).length;
    if (targetAttemptCount >= MAX_ATTEMPTS) {
      feedbackTimeout.clear();
      handleGameOverRef.current?.(false, newAttempts);
    }
  }, [state.attempts, playWordAcceptedSound, t, showToast, clueActions, language, feedbackTimeout]);

  // Handle discovery feedback (for different-length words)
  // This shows feedback overlay and persists yellow/green letters without counting as a "try"
  const handleDiscoveryFeedback = useCallback((word: string, target: string) => {
    // Skip if word is too short for meaningful feedback (2+ letters for all languages)
    if (word.length < MIN_DISCOVERY_WORD_LENGTH) return;

    // Pass language to enable Hebrew final letter normalization
    const feedback = getLetterFeedback(word, target, language);

    // Only add to attempts if there's at least one non-gray feedback
    // (i.e., the word contains at least one letter from the target)
    const hasRelevantFeedback = feedback.some(fb => fb.feedback !== 'gray');
    if (!hasRelevantFeedback) return;

    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
      isDiscovery: true, // Mark as discovery - won't count toward tries
    };

    dispatch({ type: 'ADD_ATTEMPT', payload: { attempt: newAttempt } });

    // Update clues from feedback (adds greens to accumulatedClues, yellows to knownLetters)
    const newAttempts = [...state.attempts, newAttempt];
    clueActions.updateCluesFromFeedback(feedback, newAttempts);

    // Show feedback overlay
    feedbackTimeout.clear();
    dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: true, feedback } });

    feedbackTimeout.set(() => {
      dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: false } });
    }, FEEDBACK_OVERLAY_DURATION);

    // No win check (different length can't be the target)
    // No life penalty (discovery has its own rewards/penalties)
    // No max attempts check (discoveries don't count as tries)
  }, [state.attempts, clueActions, language, feedbackTimeout]);

  // Handle word discovery - accepts 2+ letter words (target word min is enforced separately)
  const handleWordDiscovery = useCallback(async (word: string) => {
    if (word.length < MIN_DISCOVERY_WORD_LENGTH) {
      showToast('too-short', t('wordHunt.feedback.tooShort') || `Minimum ${MIN_DISCOVERY_WORD_LENGTH} letters`);
      return;
    }

    if (state.discoveredWords.some(w => w.word === word)) {
      showToast('duplicate', t('wordHunt.feedback.duplicate') || 'Already found!');
      return;
    }

    if (!isWordOnBoard(word, grid, language)) {
      dispatch({ type: 'ADJUST_LIFE', payload: { delta: -INVALID_WORD_PENALTY } });
      showToast('not-on-board', t('wordHunt.feedback.notOnBoardPenalty') || `Not on board -${INVALID_WORD_PENALTY}`);
      recordNotOnBoard(word, language, 'daily_word_hunt');
      return;
    }

    const isValidWord = await validateWordInDictionary(word);
    if (!isValidWord) {
      dispatch({ type: 'ADJUST_LIFE', payload: { delta: -NOT_IN_DICTIONARY_PENALTY } });
      showToast('not-in-dictionary', t('wordHunt.feedback.notInDictionary') || `Not a word -${NOT_IN_DICTIONARY_PENALTY}`);
      recordNotInDictionary(word, language, 'daily_word_hunt');
      return;
    }

    const baseLifeGained = calculateLifeReward(word.length);
    const longWordBonus = getLifeBonusForWord(word.length);
    const lifeGained = baseLifeGained + longWordBonus;
    const tokensGained = calculateTokenReward(word.length);

    const discovery: WordDiscovery = {
      word,
      lifeGained,
      tokensGained,
      timestamp: Date.now(),
    };

    const newLife = Math.min(INITIAL_LIFE, state.lifePoints + lifeGained);
    dispatch({ type: 'DISCOVER_WORD', payload: { discovery, newLife } });
    playWordAcceptedSound?.();

    // Update clues from discovery (handles greens, known letters, and cleanup)
    const cluesRevealed = clueActions.updateCluesFromDiscovery(word);

    // Life gain animation
    dispatch({ type: 'SET_LIFE_GAIN_ANIMATION', payload: { amount: lifeGained, isGaining: true } });
    lifeAnimationTimeout.set(() => dispatch({ type: 'STOP_LIFE_ANIMATION' }), 600);

    // Clue gain animation
    if (cluesRevealed > 0) {
      clueActions.triggerClueGainAnimation(cluesRevealed);
    }

    // Show reward toast with bonus info for long words
    const rewardMessage = formatRewardMessage({ lifeGained, tokensGained });
    const bonusMessage = longWordBonus > 0
      ? `${rewardMessage} 🔥 +${longWordBonus} long word bonus!`
      : rewardMessage;
    showToast('valid-word', bonusMessage);
  }, [state.discoveredWords, state.lifePoints, grid, language, playWordAcceptedSound, showToast, t, validateWordInDictionary, clueActions, lifeAnimationTimeout]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (state.isGameOver) return;

    // Keep original uppercase for display
    const displayWord = word.toUpperCase();
    // Normalize words for comparison (handles Hebrew final letters, Spanish accents, etc.)
    const normalizedWord = normalizeWord(displayWord, language);
    const normalizedTarget = normalizeWord(targetWord.toUpperCase(), language);

    if (normalizedWord === normalizedTarget) {
      // Pass display word for UI, target word as-is (getLetterFeedback will normalize internally)
      handleTargetAttemptRef.current?.(displayWord, targetWord.toUpperCase());
    } else if (normalizedWord.length === normalizedTarget.length) {
      // Check for duplicates using normalized comparison
      if (state.attempts.some(a => normalizeWord(a.word, language) === normalizedWord)) {
        showToast('duplicate', t('wordHunt.alreadyGuessed') || 'Already guessed!');
        return;
      }

      if (isWordOnBoard(displayWord, grid, language)) {
        handleWordDiscoveryRef.current?.(displayWord);
        handleTargetAttemptRef.current?.(displayWord, targetWord.toUpperCase());
      } else {
        // Word can't be formed on board - only apply "not on board" penalty
        dispatch({ type: 'ADJUST_LIFE', payload: { delta: -INVALID_WORD_PENALTY } });
        showToast('not-on-board', t('wordHunt.feedback.notFormablePenalty') || `Not on board -${INVALID_WORD_PENALTY}`);
        recordNotOnBoard(displayWord, language, 'daily_word_hunt');
      }
    } else {
      // Different length word - process as discovery AND show feedback
      handleWordDiscoveryRef.current?.(displayWord);
      // Also compute and show feedback so yellow/green letters persist in boxes
      handleDiscoveryFeedbackRef.current?.(displayWord, targetWord.toUpperCase());
    }
  }, [state.isGameOver, state.attempts, targetWord, grid, language, showToast, t]);

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

  // Auto-Unlock Effect: Check periodically or on token change
  useEffect(() => {
    const nextItem = hintState.nextHintItem;

    // Skip if no next item, not enough tokens, or already unlocking this item
    if (!nextItem || state.clueTokens < nextItem.cost || pendingUnlockRef.current === nextItem.id) {
      return undefined;
    }

    // Mark this hint as pending unlock to prevent race conditions
    pendingUnlockRef.current = nextItem.id;

    // Auto-unlock with a small delay for smooth UX
    const timer = setTimeout(() => {
      buyNextHint();
      showAutoClueNotification(nextItem.id);
      // Clear pending after unlock completes
      pendingUnlockRef.current = null;
    }, 500);

    return () => {
      clearTimeout(timer);
      // Only clear pending if it matches (prevents clearing if a new hint started)
      if (pendingUnlockRef.current === nextItem.id) {
        pendingUnlockRef.current = null;
      }
    };
  }, [state.clueTokens, hintState.nextHintItem, buyNextHint, showAutoClueNotification]);

  // Keep callback refs in sync
  useEffect(() => {
    handleGameOverRef.current = handleGameOver;
  }, [handleGameOver]);

  useEffect(() => {
    handleTargetAttemptRef.current = handleTargetAttempt;
  }, [handleTargetAttempt]);

  useEffect(() => {
    handleWordDiscoveryRef.current = handleWordDiscovery;
  }, [handleWordDiscovery]);

  useEffect(() => {
    handleDiscoveryFeedbackRef.current = handleDiscoveryFeedback;
  }, [handleDiscoveryFeedback]);

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
  };

  const actions: SurvivalGameActions = {
    handleWordSubmit,
    handleWordChange,
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
    gameDir,
    clueContainerRef,
  };

  return [returnState, actions];
}
