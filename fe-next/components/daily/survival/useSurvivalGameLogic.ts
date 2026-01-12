'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { formatRewardMessage } from '@/utils/formatRewardMessage';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { logGameStart, logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import { isNewDailyPlayer, incrementDailyChallengesCompleted } from '@/utils/trainingProgressStorage';
import { useSurvivalClues } from './useSurvivalClues';
import { useSurvivalHints } from './useSurvivalHints';

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

  // Refs
  const clueContainerRef = useRef<HTMLDivElement>(null);
  const lifeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverRef = useRef(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);

  // Session tracking
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);

  // Life state
  const [lifePoints, setLifePoints] = useState(INITIAL_LIFE);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [isLifeGaining, setIsLifeGaining] = useState(false);
  const [lifeGainAmount, setLifeGainAmount] = useState<number | null>(null);

  // Word discovery state
  const [discoveredWords, setDiscoveredWords] = useState<WordDiscovery[]>([]);
  const [clueTokens, setClueTokens] = useState(0);

  // Target word attempts
  const [attempts, setAttempts] = useState<TargetAttempt[]>([]);
  const [latestAttemptFeedback, setLatestAttemptFeedback] = useState<LetterFeedback[] | null>(null);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);

  // UI state
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [showShop, setShowShop] = useState(false); // Kept for backwards compatibility, but shop is disabled
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showShopHint, setShowShopHint] = useState(false); // Deprecated - shop removed

  // Toast feedback
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Notification state
  const [activeNotifications, setActiveNotifications] = useState<AutoClueNotificationData[]>([]);

  // Toast helpers
  const showToast = useCallback((type: FeedbackType, message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
  }, []);

  const closeToast = useCallback(() => {
    setFeedbackType(null);
    setFeedbackMessage('');
  }, []);

  // Live score tracking
  const [liveScoreState] = useLiveScoreTracker({
    lifePoints,
    clueTokens,
    discoveredWords,
    attempts,
    isGameOver,
  });

  // Notification actions
  const showAutoClueNotification = useCallback((clueType: string) => {
    const notification: AutoClueNotificationData = {
      id: `${Date.now()}-${clueType}`,
      clueType: clueType as 'reveal_letter' | 'reveal_category' | 'example_sentence',
      timestamp: Date.now(),
    };
    setActiveNotifications(prev => [...prev, notification]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
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
      if (sessionId) setGameSessionId(sessionId);
    }
    initGameSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start fire round music
  useEffect(() => {
    fadeToTrack(TRACKS.BOSSA_ARCADE, 500, 800);
  }, [fadeToTrack, TRACKS]);

  // Check if player is new (first 3 daily challenges) - calculated once
  const isNewPlayer = useRef(isNewDailyPlayer(NEW_PLAYER_THRESHOLD));
  const drainRate = isNewPlayer.current ? NEW_PLAYER_LIFE_DRAIN_RATE : LIFE_DRAIN_RATE;

  // Life drain effect
  useEffect(() => {
    if (isGameOver) {
      if (lifeIntervalRef.current) clearInterval(lifeIntervalRef.current);
      return;
    }

    lifeIntervalRef.current = setInterval(() => {
      setLifePoints(prev => {
        const newLife = Math.max(0, prev - drainRate);
        if (newLife === 0 && !gameOverRef.current) {
          handleGameOverRef.current?.(false);
        }
        return newLife;
      });
    }, 1000);

    return () => {
      if (lifeIntervalRef.current) clearInterval(lifeIntervalRef.current);
    };
  }, [isGameOver, drainRate]);

  // Cleanup feedback timeout
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

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
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Handle game over
  const handleGameOver = useCallback(async (won: boolean, finalAttempts?: TargetAttempt[]) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setIsGameOver(true);
    setHasWon(won);

    fadeToTrack(TRACKS.BOSSA, 1000, 1500);

    if (lifeIntervalRef.current) clearInterval(lifeIntervalRef.current);

    const attemptsToUse = finalAttempts || attempts;

    const result: SurvivalGameResult = {
      solved: won,
      attemptsUsed: attemptsToUse.length,
      targetWord,
      attempts: attemptsToUse,
      wordsDiscovered: discoveredWords,
      lifeRemaining: lifePoints,
      clueTokensEarned: clueTokens + hintState.tokensSpent,
      clueTokensSpent: hintState.tokensSpent,
      hintsUnlocked: hintState.currentHint?.level || 0,
      efficiencyScore: calculateEfficiencyScore(
        lifePoints,
        clueTokens,
        attemptsToUse.length,
        discoveredWords.length,
        won
      ),
    };

    if (gameSessionId) {
      const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      const wordsFoundFormatted = formatWordsForLogging(
        discoveredWords.map(w => w.word),
        discoveredWords.map(w => ({
          word: w.word,
          points: w.lifeGained + (w.tokensGained * 10),
          timestamp: w.timestamp,
        }))
      );

      await logGameEnd(gameSessionId, {
        score: result.efficiencyScore,
        wordsFound: wordsFoundFormatted,
        durationSeconds,
        completed: true,
        targetFound: won,
        attemptsUsed: attemptsToUse.length,
        lifeRemaining: lifePoints,
        lifeGained: discoveredWords.reduce((sum, w) => sum + w.lifeGained, 0),
        tokensEarned: clueTokens + hintState.tokensSpent,
        tokensSpent: hintState.tokensSpent,
        cluesUsed: hintState.tokensSpent > 0 ? Math.ceil(hintState.tokensSpent / 5) : 0,
      });
    }

    // Track daily challenge completion for new player detection
    incrementDailyChallengesCompleted();

    onComplete(result);
  }, [attempts, discoveredWords, lifePoints, clueTokens, hintState.tokensSpent, hintState.currentHint, targetWord, onComplete, gameSessionId, fadeToTrack, TRACKS]);

  // Handle target attempt
  const handleTargetAttempt = useCallback((word: string, target: string) => {
    if (attempts.some(a => a.word === word)) {
      showToast('duplicate', t('wordHunt.alreadyGuessed') || 'Already guessed!');
      return;
    }

    const feedback = getLetterFeedback(word, target);
    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
    };

    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);
    playWordAcceptedSound?.();

    // Update clues from feedback
    clueActions.updateCluesFromFeedback(feedback, newAttempts);

    // Show feedback overlay
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setLatestAttemptFeedback(feedback);
    setShowFeedbackOverlay(true);

    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedbackOverlay(false);
    }, FEEDBACK_OVERLAY_DURATION);

    // Check if correct
    const won = isTargetWordFound(feedback);
    if (won) {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      handleGameOverRef.current?.(true, newAttempts);
      return;
    }

    // Wrong guess - penalize
    setLifePoints(prev => Math.max(0, prev - INVALID_WORD_PENALTY));

    // Check if out of attempts
    if (newAttempts.length >= MAX_ATTEMPTS) {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      handleGameOverRef.current?.(false, newAttempts);
    }
  }, [attempts, playWordAcceptedSound, t, showToast, clueActions]);

  // Handle word discovery
  const handleWordDiscovery = useCallback(async (word: string) => {
    if (word.length < 2) {
      showToast('too-short', t('wordHunt.feedback.tooShort') || 'Minimum 2 letters');
      return;
    }

    if (discoveredWords.some(w => w.word === word)) {
      showToast('duplicate', t('wordHunt.feedback.duplicate') || 'Already found!');
      return;
    }

    if (!isWordOnBoard(word, grid, language)) {
      setLifePoints(prev => Math.max(0, prev - INVALID_WORD_PENALTY));
      showToast('not-on-board', t('wordHunt.feedback.notOnBoardPenalty') || `Not on board -${INVALID_WORD_PENALTY}`);
      return;
    }

    const isValidWord = await validateWordInDictionary(word);
    if (!isValidWord) {
      setLifePoints(prev => Math.max(0, prev - NOT_IN_DICTIONARY_PENALTY));
      showToast('not-in-dictionary', t('wordHunt.feedback.notInDictionary') || `Not a word -${NOT_IN_DICTIONARY_PENALTY}`);
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

    setDiscoveredWords(prev => [...prev, discovery]);
    setLifePoints(prev => Math.min(INITIAL_LIFE, prev + lifeGained));
    setClueTokens(prev => prev + tokensGained);
    playWordAcceptedSound?.();

    // Update clues from discovery
    const cluesRevealed = clueActions.updateCluesFromDiscovery(word);
    clueActions.updateKnownLettersFromDiscovery(word);

    // Life gain animation
    setLifeGainAmount(lifeGained);
    setIsLifeGaining(true);
    setTimeout(() => setIsLifeGaining(false), 600);

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
  }, [discoveredWords, grid, language, playWordAcceptedSound, showToast, t, validateWordInDictionary, clueActions]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;

    const normalizedWord = word.toUpperCase();
    const normalizedTarget = targetWord.toUpperCase();

    if (normalizedWord === normalizedTarget) {
      handleTargetAttemptRef.current?.(normalizedWord, normalizedTarget);
    } else if (normalizedWord.length === normalizedTarget.length) {
      if (attempts.some(a => a.word === normalizedWord)) {
        showToast('duplicate', t('wordHunt.alreadyGuessed') || 'Already guessed!');
        return;
      }

      if (isWordOnBoard(normalizedWord, grid, language)) {
        handleWordDiscoveryRef.current?.(normalizedWord);
        handleTargetAttemptRef.current?.(normalizedWord, normalizedTarget);
      } else {
        setLifePoints(prev => Math.max(0, prev - INVALID_WORD_PENALTY));
        showToast('not-on-board', t('wordHunt.feedback.notFormablePenalty') || `Not on board -${INVALID_WORD_PENALTY}`);
        handleTargetAttemptRef.current?.(normalizedWord, normalizedTarget);
      }
    } else {
      handleWordDiscoveryRef.current?.(normalizedWord);
    }
  }, [isGameOver, targetWord, attempts, grid, language, showToast, t]);

  // Handle purchase wrapper
  const handlePurchase = useCallback((item: ClueShopItem) => {
    hintActions.handlePurchase(item, clueTokens, setClueTokens, setShowShop);
  }, [hintActions, clueTokens]);

  const buyNextHint = useCallback(() => {
    hintActions.buyNextHint(clueTokens, setClueTokens);
  }, [hintActions, clueTokens]);

  // Auto-Unlock Effect: Check periodically or on token change
  useEffect(() => {
    // If next item exists and we have enough tokens, buy it automatically
    // But we need to be careful about loops or repeatedly trying to buy if it fails (it shouldn't if cost check passes)
    // Also buyNextHint is wrapped in useCallback with deps [hintActions, clueTokens]

    const nextItem = hintState.nextHintItem;
    if (nextItem && clueTokens >= nextItem.cost) {
        // Auto-unlock!
        // We use a small timeout to avoid immediate state updates during render or races,
        // and to give a nice "Ding!" feeling slightly after the coin arrives.
        const timer = setTimeout(() => {
             buyNextHint();
             // Show notification after successful unlock
             showAutoClueNotification(nextItem.id);
        }, 500);
        return () => clearTimeout(timer);
    }
    return undefined;
  }, [clueTokens, hintState.nextHintItem, buyNextHint, showAutoClueNotification]);

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

  const state: SurvivalGameState = {
    lifePoints,
    isGameOver,
    hasWon,
    isLifeGaining,
    lifeGainAmount,
    discoveredWords,
    clueTokens,
    tokensSpent: hintState.tokensSpent,
    attempts,
    latestAttemptFeedback,
    showFeedbackOverlay,
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
    activeNotifications,
    formedWord,
    letterCount,
    showShop,
    showShopHint,
    showQuitConfirm,
    isClueGaining: clueState.isClueGaining,
    feedbackType,
    feedbackMessage,
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

  return [state, actions];
}
