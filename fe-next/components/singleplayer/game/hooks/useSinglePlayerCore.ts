'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { selectRandomRevealWord, getRevealableWordCount } from '@/utils/wordPathFinder';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useAutoScrollOnGameStart } from '@/hooks/useAutoScrollOnGameStart';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useGiftModalPause } from '@/hooks/useGiftModalPause';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast } from '@/components/NeoToast';
import { awardComboCoins } from '@/utils/coinManager';
import { hapticForWordScore, hapticError } from '@/utils/haptics';
import { useAnnouncer } from '@/components/GameAnnouncer';
import { useDirectionPatternGuidance } from '@/hooks/useDirectionPatternGuidance';
import { useFirstPlayTutorial } from '@/hooks/useFirstPlayTutorial';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useTrainingAnalysis } from '@/hooks/useTrainingAnalysis';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import {
  calculateFinalAchievements,
  checkLiveAchievements,
  createAchievementState,
  type WordData as AchievementWordData,
  type SinglePlayerAchievement,
} from '@/utils/singlePlayerAchievements';
import { finalizeWordValidation } from '@/utils/wordValidationAPI';
import { getComboBonus as calculateComboBonus } from '@/shared/utils/scoring';
import { useBotSimulation } from './useBotSimulation';
import { useSpamDetection } from './useSpamDetection';
import type { SinglePlayerGameState, SinglePlayerResultsData, BotOpponent } from '../../SinglePlayerView';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { FoundWord, TrainingState, DirectionGuidanceState, KeyboardInputState } from '../types';

interface UseSinglePlayerCoreOptions {
  settings: SinglePlayerGameState;
  targetHighScore: number | null;
  onGameEnd: (results: SinglePlayerResultsData) => void;
  onQuit: () => void;
}

interface AvailableWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

const MIN_TRACKED_WORD_LENGTH = 5;

/**
 * Core hook for single player game logic
 * Consolidates all state management, effects, and handlers
 */
export function useSinglePlayerCore({
  settings,
  targetHighScore,
  onGameEnd,
  onQuit,
}: UseSinglePlayerCoreOptions) {
  const { t } = useLanguage();
  const {
    playWordAcceptedSound,
    playComboSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
    setGameActive,
  } = useSoundEffects();
  const { announceWordResult, announceCombo, announceTimer } = useAnnouncer();

  // Layout detection
  const isLandscape = useMobileLandscape();
  const { isDesktop, isTv } = useDesktopLayout();
  const isGiftModalOpen = useGiftModalPause();

  // Core game state
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isValidatingWords, setIsValidatingWords] = useState(false);
  const [availableWords, setAvailableWords] = useState<AvailableWords | null>(null);

  // UI state
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showLandscapeTutorial, setShowLandscapeTutorial] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [showHintPrompt, setShowHintPrompt] = useState(false);
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);
  const [isEarthquakePaused, setIsEarthquakePaused] = useState(false);
  const [progressBarExpanded, setProgressBarExpanded] = useState(false);
  const [comboCoinReward, setComboCoinReward] = useState<number | null>(null);

  // Achievement state
  const [liveAchievements, setLiveAchievements] = useState<SinglePlayerAchievement[]>([]);
  const achievementStateRef = useRef(createAchievementState());

  // Reveal word state
  const [revealState, setRevealState] = useState<{
    revealsUsed: number;
    isLoading: boolean;
    highlightedPath: Array<{ row: number; col: number }>;
  }>({
    revealsUsed: 0,
    isLoading: false,
    highlightedPath: [],
  });

  // Refs
  const availableWordsRef = useRef(availableWords);
  const lastWordFoundTimeRef = useRef<number>(0);
  const gridVersionRef = useRef(0);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const gameStartTimeRef = useRef<number>(0);
  const scoreRef = useRef(score);
  const foundWordsRef = useRef(foundWords);
  const botScoresRef = useRef<Record<string, number>>({});
  const botWordsRef = useRef<Record<string, string[]>>({});
  const gridRef = useRef(grid);
  const onGameEndRef = useRef(onGameEnd);
  const showHintPromptRef = useRef(showHintPrompt);
  const isTypingModeRef = useRef(false);
  const gameStatsRef = useRef<HTMLDivElement>(null);

  // Bot simulation
  const { botScores, botWords, resetBots, initializeBotUsedWords } = useBotSimulation({
    mode: settings.mode,
    bots: settings.bots,
    isPaused,
    isGameOver,
    availableWords,
  });

  // Spam detection
  const { checkSubmission, resetSpamDetection } = useSpamDetection();

  // Combo system
  const combo = useComboSystem({
    onComboSound: (level) => {
      if (level >= 2) playComboSound(level);
    },
    onComboMilestone: (level) => {
      const coinsAwarded = awardComboCoins(level, 'singleplayer');
      if (coinsAwarded > 0) setComboCoinReward(coinsAwarded);
    },
    trackMaxCombo: true,
  });

  // Direction guidance
  const directionGuidance = useDirectionPatternGuidance();

  // First-play tutorial
  const firstPlayTutorial = useFirstPlayTutorial({
    grid,
    availableWords,
    language: settings.language,
    isGameActive: !!grid && !isPaused && !isGameOver,
  });

  // Training analysis (practice mode)
  const trainingGridSize = useMemo(() => ({ rows: 5, cols: 5 }), []);
  const handleTrainingAnalysisComplete = useCallback(() => {}, []);

  // CRITICAL: Destructure to get stable function references for dependency arrays.
  // Using the entire hook object in dependencies causes infinite re-render loops
  // because the object reference changes on each render even if functions are stable.
  const {
    trackPath: trainingAnalysisTrackPath,
    trackValidWord: trainingAnalysisTrackValidWord,
    currentHint: trainingAnalysisCurrentHint,
    dismissHint: trainingAnalysisDismissHint,
    finishTraining: trainingAnalysisFinishTraining,
    hasPassed: trainingAnalysisHasPassed,
  } = useTrainingAnalysis({
    enabled: settings.mode === 'practice',
    gridSize: trainingGridSize,
    onTrainingComplete: handleTrainingAnalysisComplete,
  });

  // Training progress
  const handleTrainingSkillUnlock = useCallback((skillId: string) => {
    console.log(`Skill unlocked: ${skillId}`);
  }, []);

  const handleTrainingComplete = useCallback(() => {
    setShowCompletionPopup(true);
  }, []);

  // CRITICAL: Destructure to get stable function references (updateProgress, trackPath, trackValidWord)
  // instead of using the whole hook object. Inline objects create new references each render,
  // which causes useEffect dependencies to trigger infinitely.
  const {
    completedSkills: trainingCompletedSkills,
    completedSkillsRef: trainingCompletedSkillsRef,
    justUnlocked: trainingJustUnlocked,
    isComplete: trainingIsComplete,
    clearJustUnlocked: trainingClearJustUnlocked,
    updateProgress: trainingUpdateProgress,
    trackPath: trainingTrackPath,
    trackValidWord: trainingTrackValidWord,
  } = useTrainingProgress({
    enabled: settings.mode === 'practice',
    onSkillUnlock: handleTrainingSkillUnlock,
    onComplete: handleTrainingComplete,
  });

  // Timer
  const timer = useGameTimer({
    initialTime: settings.timerSeconds,
    isPaused: isPaused || settings.mode === 'practice',
    isExternallyPaused: isEarthquakePaused || isGiftModalOpen,
    autoStart: settings.mode !== 'practice',
    onTimeUp: () => {
      if (!gameOverCalledRef.current) setIsGameOver(true);
    },
  });

  // Navigation guard
  useNavigationGuard({
    enabled: !!grid && !isGameOver && score > 0,
    message: t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?',
    onNavigationAttempt: () => {
      setShowQuitConfirm(true);
      return false;
    },
  });

  // Auto-scroll
  const gameActive = !!grid && !isPaused && !isGameOver && timer.remainingTime > 0;
  useAutoScrollOnGameStart(gameStatsRef, { gameActive, isLandscape });

  // CrazyGames lifecycle
  useCrazyGamesLifecycle({
    isGameActive: gameActive,
    isGameOver,
    score,
    maxCombo: combo.maxCombo,
  });

  // Earthquake/Fire Round
  const {
    earthquakeState,
    fireRoundActive,
    fireRoundRemaining,
    getScoreMultiplier,
  } = useEarthquakeFireRound({
    enabled: settings.mode !== 'practice',
    gameDurationSeconds: settings.timerSeconds,
    currentTimeSeconds: timer.remainingTime,
    language: settings.language,
    difficulty: settings.difficulty,
    mode: 'singleplayer',
    onGridRegenerate: (newGrid) => {
      setGrid(newGrid);
      foundWordsSetRef.current.clear();
    },
    onEarthquakeStart: () => {
      playEarthquakeRumble();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 100, 150, 100, 200]);
      }
    },
    onEarthquakeShake: () => {
      playEarthquakeShake();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 400, 150, 300]);
      }
    },
    onFireRoundStart: () => {
      playFireRoundStart();
      startFireCrackleLoop();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
    },
    onFireRoundEnd: stopFireCrackleLoop,
    onTimerPause: () => setIsEarthquakePaused(true),
    onTimerResume: () => setIsEarthquakePaused(false),
  });

  // Game music
  useGameMusic({
    phase: 'playing',
    remainingTime: timer.remainingTime,
    totalTime: settings.timerSeconds,
    isPaused: isPaused || isGameOver || settings.mode === 'practice',
    enabled: settings.mode !== 'practice',
    earthquakeState,
  });

  // Calculate word score
  const calculateWordScore = useCallback((wordLength: number, currentComboLevel: number): number => {
    const baseScore = Math.max(wordLength - 1, 1);
    const comboBonus = calculateComboBonus(currentComboLevel, wordLength);
    const multiplier = getScoreMultiplier();
    return (baseScore + comboBonus) * multiplier;
  }, [getScoreMultiplier]);

  // Word submission handler - defined before keyboardInput
  const handleWordSubmit = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    const minWordLength = settings.minWordLength ?? 3;
    const now = Date.now();

    const spamResult = checkSubmission();
    if (!spamResult.allowed) {
      if (spamResult.isCooldown) {
        const msg = spamResult.remainingCooldown
          ? t('playerView.slowDown') || `Slow down! Wait ${spamResult.remainingCooldown}s`
          : t('playerView.tooFast') || 'Too fast! 3s cooldown';
        wordErrorToast(msg, { duration: spamResult.remainingCooldown ? 1500 : 2000 });
        if (!spamResult.remainingCooldown) combo.resetCombo();
      }
      return;
    }

    if (spamResult.isWarning) {
      wordErrorToast(t('playerView.submittingTooFast') || 'Submitting too fast!', { duration: 1500 });
    }

    const localValidation = validateWordLocally(
      normalizedWord, settings.language, minWordLength,
      foundWords.map(fw => ({ word: fw.word, isValid: fw.isValid }))
    );

    if (!localValidation.isValid) {
      const errorKey = localValidation.errorKey ?? 'Invalid word';
      let msg = t(errorKey) || errorKey;
      if (localValidation.errorParams?.min) msg = msg.replace('${min}', String(localValidation.errorParams.min));
      setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord, message: msg, timestamp: now });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, msg);
      combo.resetCombo();
      return;
    }

    const currentGrid = gridRef.current;
    if (!currentGrid || !isWordOnBoard(normalizedWord, currentGrid, settings.language)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard') || 'Word not on board';
      setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord, message: notOnBoardMsg, timestamp: now });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, notOnBoardMsg);
      combo.resetCombo();
      return;
    }

    if (foundWordsSetRef.current.has(normalizedWord)) {
      const alreadyFoundMsg = t('playerView.wordAlreadyFound') || 'Already found!';
      setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord, message: alreadyFoundMsg, timestamp: now });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, alreadyFoundMsg);
      combo.resetCombo();
      return;
    }

    foundWordsSetRef.current.add(normalizedWord);
    const currentCombo = combo.comboLevelRef.current;
    const baseScore = calculateWordScore(normalizedWord.length, 0);
    const fullScore = calculateWordScore(normalizedWord.length, currentCombo);
    const timeSinceStart = (now - gameStartTimeRef.current) / 1000;

    const newWord: FoundWord = { word: normalizedWord, score: baseScore, timestamp: now, timeSinceStart, isValid: null };
    foundWordsRef.current = [...foundWordsRef.current, newWord];
    setFoundWords(foundWordsRef.current);

    fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language: settings.language }),
    })
      .then(res => res.ok ? res.json() : { isValid: false, source: 'pending' })
      .then(result => {
        if (result.isValid) {
          const wordLenScore = Math.max(normalizedWord.length - 1, 1);
          const comboBonus = calculateComboBonus(currentCombo, normalizedWord.length);
          const scoreWithoutMultiplier = wordLenScore + comboBonus;
          const multiplier = getScoreMultiplier();
          const fireRoundBonus = multiplier > 1 ? scoreWithoutMultiplier : 0;

          foundWordsRef.current = foundWordsRef.current.map(fw =>
            fw.word === normalizedWord && fw.timestamp === now
              ? { ...fw, isValid: true, score: fullScore, comboBonus, fireRoundBonus }
              : fw
          );
          setFoundWords(foundWordsRef.current);
          setScore(prev => prev + fullScore);
          playWordAcceptedSound();
          hapticForWordScore(normalizedWord.length);
          lastWordFoundTimeRef.current = Date.now();
          setShowHintPrompt(false);
          combo.incrementCombo(true);
          trainingAnalysisTrackValidWord(normalizedWord.length);
          trainingTrackValidWord(normalizedWord.length);
          if (combo.validWordCount > 1) playComboSound(currentCombo + 1);
          setCurrentFeedback({
            id: `accept-${now}`, type: 'accepted', word: normalizedWord.toUpperCase(),
            score: fullScore, fireRoundActive, fireRoundBonus, timestamp: now,
          });
          announceWordResult(normalizedWord, true, fullScore);
          announceCombo(currentCombo + 1);

          // Check for live achievements
          const validatedWords = foundWordsRef.current
            .filter(fw => fw.isValid === true)
            .map(fw => ({
              word: fw.word,
              score: fw.score,
              timestamp: fw.timestamp,
              timeSinceStart: fw.timeSinceStart,
              isValid: true,
              comboBonus: fw.comboBonus,
            }));

          const newAchievements = checkLiveAchievements(
            achievementStateRef.current,
            validatedWords,
            normalizedWord,
            true,
            timeSinceStart,
            currentCombo + 1,
            settings.timerSeconds
          );

          if (newAchievements.length > 0) {
            setLiveAchievements(prev => [...prev, ...newAchievements]);
          }
        } else {
          combo.resetCombo();
          setCurrentFeedback({ id: `pending-${now}`, type: 'pending', word: normalizedWord.toUpperCase(), timestamp: now });
        }
      })
      .catch(() => {
        combo.resetCombo();
        setCurrentFeedback({ id: `pending-${Date.now()}`, type: 'pending', word: normalizedWord.toUpperCase(), timestamp: Date.now() });
      });
  }, [settings.language, settings.minWordLength, settings.timerSeconds, foundWords, t, playWordAcceptedSound, playComboSound, announceWordResult, announceCombo, combo, getScoreMultiplier, fireRoundActive, calculateWordScore, trainingAnalysisTrackValidWord, trainingTrackValidWord, checkSubmission]);

  // Keyboard input
  const keyboardInput = useKeyboardWordInput({
    grid: grid || ([] as LetterGrid),
    language: settings.language,
    gameLanguage: settings.language,
    enabled: !!grid && !isPaused && !isGameOver,
    onWordSubmit: handleWordSubmit,
    minWordLength: settings.minWordLength ?? 3,
  });

  // Keep refs in sync
  useEffect(() => {
    scoreRef.current = score;
    foundWordsRef.current = foundWords;
    botScoresRef.current = botScores;
    botWordsRef.current = botWords;
    gridRef.current = grid;
    availableWordsRef.current = availableWords;
    onGameEndRef.current = onGameEnd;
    showHintPromptRef.current = showHintPrompt;
    isTypingModeRef.current = keyboardInput.isTypingMode;
  }, [score, foundWords, botScores, botWords, grid, availableWords, onGameEnd, showHintPrompt, keyboardInput.isTypingMode]);

  // Initialize game start time
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
  }, []);

  // Sound effects activation
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Heartbeat for admin visibility
  useEffect(() => {
    const sessionId = crypto.randomUUID();
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/single-player/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, language: settings.language, mode: settings.mode }),
        });
      } catch { /* ignore */ }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => {
      clearInterval(interval);
      fetch('/api/single-player/heartbeat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };
  }, [settings.language, settings.mode]);

  // Landscape tutorial
  useEffect(() => {
    if (isLandscape && !isGameOver) {
      const hasSeenTutorial = localStorage.getItem('landscape-tutorial-seen');
      if (!hasSeenTutorial) setShowLandscapeTutorial(true);
    }
  }, [isLandscape, isGameOver]);

  // Hint prompt timer
  useEffect(() => {
    if (isPaused || isGameOver || !grid) return;
    const HINT_PROMPT_DELAY = 15000;
    if (lastWordFoundTimeRef.current === 0) lastWordFoundTimeRef.current = Date.now();
    const checkInactivity = setInterval(() => {
      const timeSinceLastWord = Date.now() - lastWordFoundTimeRef.current;
      if (timeSinceLastWord >= HINT_PROMPT_DELAY && !showHintPromptRef.current) {
        setShowHintPrompt(true);
      }
    }, 5000);
    return () => clearInterval(checkInactivity);
  }, [isPaused, isGameOver, grid]);

  // Timer announcements
  useEffect(() => {
    if (gameActive) announceTimer(timer.remainingTime);
  }, [timer.remainingTime, gameActive, announceTimer]);

  // Training progress updates
  const validWordsCount = useMemo(() => foundWords.filter(fw => fw.isValid === true).length, [foundWords]);

  useEffect(() => {
    if (settings.mode !== 'practice' || score < 15) return;
    const skillsRef = trainingCompletedSkillsRef.current;
    trainingUpdateProgress({
      score,
      wordsFound: validWordsCount,
      hasDiagonal: skillsRef?.has('diagonal') ?? false,
      hasDirectionChange: skillsRef?.has('directionChange') ?? false,
    });
  }, [score, settings.mode, validWordsCount, trainingUpdateProgress, trainingCompletedSkillsRef]);

  // Generate grid
  useEffect(() => {
    const difficultyConfig = DIFFICULTIES[settings.difficulty];
    const rows = difficultyConfig.rows;
    const cols = difficultyConfig.cols;
    const totalCells = rows * cols;
    const baseWordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    const wordCount = settings.mode === 'practice' ? Math.min(50, baseWordCount * 2) : baseWordCount;
    const maxWordLen = Math.min(12, Math.max(rows, cols));

    const initGrid = async () => {
      let wordsToEmbed: string[] = [];
      if (settings.language !== 'ja') {
        try {
          const response = await fetch('/api/themed-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: settings.language, count: wordCount, minLength: 3, maxLength: maxWordLen }),
          });
          if (response.ok) {
            const data = await response.json();
            wordsToEmbed = data.words || [];
          }
        } catch (error) {
          console.warn('Failed to fetch themed words:', error);
        }
      }
      const newGrid = generateRandomTable(rows, cols, settings.language, wordsToEmbed);
      setGrid(newGrid);
    };

    initGrid();
    initializeBotUsedWords(settings.bots);
    resetBots();
    resetSpamDetection();
  }, [settings.difficulty, settings.language, settings.bots, settings.mode, initializeBotUsedWords, resetBots, resetSpamDetection]);

  // Fetch grid words
  useEffect(() => {
    if (!grid) return;
    gridVersionRef.current += 1;
    const currentVersion = gridVersionRef.current;

    const timeoutId = setTimeout(() => {
      if (!availableWordsRef.current) {
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    }, 5000);

    const fetchGridWords = async () => {
      try {
        const response = await fetch('/api/solve-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grid, language: settings.language }),
        });
        if (currentVersion !== gridVersionRef.current) return;
        if (!response.ok) {
          setAvailableWords({ easy: [], medium: [], hard: [] });
          return;
        }
        const result = await response.json();
        if (result.success && result.words) {
          setAvailableWords(result.words);
        } else {
          setAvailableWords({ easy: [], medium: [], hard: [] });
        }
      } catch {
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    };

    fetchGridWords();
    return () => clearTimeout(timeoutId);
  }, [grid, settings.language]);

  // Handle game over
  useEffect(() => {
    // Use grid state instead of ref to avoid sync timing issues
    if (!isGameOver || gameOverCalledRef.current || !grid) return;
    gameOverCalledRef.current = true;

    const finalizeAndEndGame = async () => {
      try {
        setIsValidatingWords(true);

        // Add timeout to prevent hanging - max 5 seconds for word validation
        const validationPromise = finalizeWordValidation(foundWordsRef.current, settings.language, 3);
        const timeoutPromise = new Promise<typeof foundWordsRef.current>((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        );

        const finalWords = await Promise.race([validationPromise, timeoutPromise]).catch(() => {
          // On timeout, use current words with pending marked as invalid
          console.warn('Word validation timed out, using current state');
          return foundWordsRef.current.map(w => w.isValid === null ? { ...w, isValid: false } : w);
        });
        setIsValidatingWords(false);

        const validWords = finalWords.filter(w => w.isValid === true);
        const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);
        const actualGameDuration = settings.mode === 'practice'
          ? Math.max(1, Math.floor((Date.now() - gameStartTimeRef.current) / 1000))
          : settings.timerSeconds;

        const validWordData: AchievementWordData[] = validWords.map(w => ({
          word: w.word, score: w.score, timestamp: w.timestamp, timeSinceStart: w.timeSinceStart,
          isValid: true, comboBonus: w.comboBonus,
        }));

        const allWordData: AchievementWordData[] = finalWords.map(w => ({
          word: w.word, score: w.score, timestamp: w.timestamp, timeSinceStart: w.timeSinceStart,
          isValid: w.isValid === true, comboBonus: w.comboBonus,
        }));

        const finalAchievements = calculateFinalAchievements(validWordData, allWordData, actualGameDuration, combo.maxCombo);
        const gameSessionId = crypto.randomUUID();

        const allBotWords = settings.bots.flatMap(bot => {
          const words = botWordsRef.current[bot.id] || [];
          return words.filter(word => !word.match(/^word\d+$/));
        });
        const playerPendingWords = finalWords.filter(w => !w.isValid).map(w => w.word);
        const combinedWords = [...new Set([...allBotWords, ...playerPendingWords])];
        const botWordsForValidation = combinedWords.sort(() => Math.random() - 0.5).slice(0, 5);

        const results: SinglePlayerResultsData = {
          playerScore: finalScore,
          playerWords: validWords.map(w => w.word),
          playerWordData: finalWords.map(w => ({
            word: w.word, score: w.isValid ? w.score : 0, timestamp: w.timestamp,
            timeSinceStart: w.timeSinceStart, isValid: w.isValid === true,
            comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
            fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
          })),
          gameDuration: actualGameDuration,
          botScores: settings.bots.map(bot => ({
            name: bot.name, score: botScoresRef.current[bot.id] || 0, words: botWordsRef.current[bot.id] || [],
          })),
          grid: grid!,
          allPossibleWords: [],
          isNewHighScore: false,
          achievements: finalAchievements,
          botWordsForValidation,
          gameSessionId,
          language: settings.language,
        };

        if (settings.mode === 'practice') trainingAnalysisFinishTraining();
        onGameEndRef.current(results);
      } catch (error) {
        // Ensure game always transitions to results even if validation fails
        console.error('Game end processing failed:', error);
        setIsValidatingWords(false);

        // Build fallback results from current state
        const currentWords = foundWordsRef.current;
        const validWords = currentWords.filter(w => w.isValid === true);
        const fallbackScore = validWords.reduce((sum, w) => sum + w.score, 0);
        const fallbackDuration = settings.mode === 'practice'
          ? Math.max(1, Math.floor((Date.now() - gameStartTimeRef.current) / 1000))
          : settings.timerSeconds;

        const fallbackResults: SinglePlayerResultsData = {
          playerScore: fallbackScore,
          playerWords: validWords.map(w => w.word),
          playerWordData: currentWords.map(w => ({
            word: w.word,
            score: w.isValid ? w.score : 0,
            timestamp: w.timestamp,
            timeSinceStart: w.timeSinceStart,
            isValid: w.isValid === true,
            comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
            fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
          })),
          gameDuration: fallbackDuration,
          botScores: settings.bots.map(bot => ({
            name: bot.name,
            score: botScoresRef.current[bot.id] || 0,
            words: botWordsRef.current[bot.id] || [],
          })),
          grid: grid!,
          allPossibleWords: [],
          isNewHighScore: false,
          achievements: [],
          botWordsForValidation: [],
          gameSessionId: crypto.randomUUID(),
          language: settings.language,
        };

        if (settings.mode === 'practice') trainingAnalysisFinishTraining();
        onGameEndRef.current(fallbackResults);
      }
    };

    finalizeAndEndGame();
  }, [isGameOver, grid, settings.bots, settings.language, settings.timerSeconds, combo.maxCombo, settings.mode, trainingAnalysisFinishTraining]);

  // Keyboard shortcuts
  useEffect(() => {
    const hasKeyboardLayout = isLandscape || isDesktop || isTv;
    if (!hasKeyboardLayout || isGameOver) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape' && isTypingModeRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        score > 0 ? setShowQuitConfirm(true) : onQuit();
      } else if (e.key === ' ' && settings.mode !== 'practice') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLandscape, isDesktop, isTv, isGameOver, score, settings.mode, onQuit]);

  // Path submission handler
  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    directionGuidance.trackWordPath(cells);
    firstPlayTutorial.trackUserPath(cells);
    trainingAnalysisTrackPath(cells);
    trainingTrackPath(cells);
  }, [directionGuidance, firstPlayTutorial, trainingAnalysisTrackPath, trainingTrackPath]);

  // Word change handler
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Handlers
  const handleFinishPractice = useCallback(() => setIsGameOver(true), []);

  const dismissLandscapeTutorial = useCallback(() => {
    setShowLandscapeTutorial(false);
    localStorage.setItem('landscape-tutorial-seen', 'true');
  }, []);

  const handleQuitRequest = useCallback(() => {
    if (settings.mode === 'practice') {
      setIsGameOver(true);
      return;
    }
    score > 0 ? setShowQuitConfirm(true) : onQuit();
  }, [score, onQuit, settings.mode]);

  const handlePauseToggle = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // UI toggle handlers (stable references for memoized props)
  const handleCoinAnimationComplete = useCallback(() => {
    setComboCoinReward(null);
  }, []);

  const handleToggleProgressBar = useCallback(() => {
    setProgressBarExpanded(prev => !prev);
  }, []);

  // Reveal handler
  const revealableWordCount = useMemo(() => {
    if (!availableWords || !grid) return 0;
    const foundWordsList = foundWords.filter(fw => fw.isValid === true).map(fw => fw.word);
    return getRevealableWordCount(availableWords, foundWordsList, settings.language);
  }, [availableWords, foundWords, grid, settings.language]);

  const handleReveal = useCallback(async () => {
    if (revealState.isLoading || !availableWords || !grid) return null;
    setRevealState(prev => ({ ...prev, isLoading: true }));
    const foundWordsList = foundWords.filter(fw => fw.isValid === true).map(fw => fw.word);
    const result = selectRandomRevealWord(availableWords, foundWordsList, grid, settings.language);
    if (!result) {
      setRevealState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
    setRevealState(prev => ({
      ...prev,
      revealsUsed: prev.revealsUsed + 1,
      isLoading: false,
      highlightedPath: result.path.map(p => ({ row: p.row, col: p.col })),
    }));
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setRevealState(prev => ({ ...prev, highlightedPath: [] }));
    }, 4000);
    return result;
  }, [revealState.isLoading, availableWords, grid, foundWords, settings.language]);

  // Computed values
  const totalBoardWords = useMemo(() => {
    if (!availableWords) return null;
    const allWords = new Set([
      ...availableWords.easy, ...availableWords.medium, ...availableWords.hard,
    ].filter(word => word.length >= MIN_TRACKED_WORD_LENGTH));
    return allWords.size;
  }, [availableWords]);

  // Build training state object for layouts
  const trainingState: TrainingState | null = settings.mode === 'practice' ? {
    completedSkills: trainingCompletedSkills,
    justUnlocked: trainingJustUnlocked,
    isComplete: trainingIsComplete,
    currentHint: trainingAnalysisCurrentHint,
    hasPassed: trainingAnalysisHasPassed,
    clearJustUnlocked: trainingClearJustUnlocked,
    dismissHint: trainingAnalysisDismissHint,
  } : null;

  const directionGuidanceState: DirectionGuidanceState = {
    showDirectionGuidance: directionGuidance.showDirectionGuidance,
    dismissDirectionGuidance: directionGuidance.dismissDirectionGuidance,
  };

  const keyboardInputState: KeyboardInputState = {
    isTypingMode: keyboardInput.isTypingMode,
    typedWord: keyboardInput.typedWord,
    highlightedCells: keyboardInput.highlightedCells,
  };

  return {
    // Layout detection
    isLandscape,
    isDesktop,
    isTv,
    // Core state
    grid,
    foundWords,
    score,
    isPaused,
    isGameOver,
    isValidatingWords,
    // Timer
    timer,
    // Combo
    combo,
    comboCoinReward,
    handleCoinAnimationComplete,
    // Word forming
    formedWord,
    letterCount,
    currentFeedback,
    // Keyboard input
    keyboardInput: keyboardInputState,
    // Tutorial
    tutorialPath: firstPlayTutorial.tutorialPath,
    tutorialWord: firstPlayTutorial.tutorialWord,
    // Reveal
    revealState,
    revealableWordCount,
    handleReveal,
    // Fire/Earthquake
    fireRoundActive,
    fireRoundRemaining,
    earthquakeState,
    // Hints
    showHintPrompt,
    setShowHintPrompt,
    // Direction guidance
    directionGuidance: directionGuidanceState,
    // Training
    training: trainingState,
    progressBarExpanded,
    handleToggleProgressBar,
    // Dialogs
    showQuitConfirm,
    setShowQuitConfirm,
    showLandscapeTutorial,
    dismissLandscapeTutorial,
    showCompletionPopup,
    setShowCompletionPopup,
    // Computed
    totalBoardWords,
    targetHighScore,
    // Achievements
    liveAchievements,
    // Refs
    lastWordFoundTimeRef,
    gameStatsRef,
    // Handlers
    handleWordSubmit,
    handlePathSubmit,
    handleWordChange,
    handlePauseToggle,
    handleFinishPractice,
    handleQuitRequest,
    onQuit,
    // Translation
    t,
  };
}
