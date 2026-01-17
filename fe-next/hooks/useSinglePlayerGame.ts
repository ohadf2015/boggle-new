'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import { useDirectionPatternGuidance } from '@/hooks/useDirectionPatternGuidance';
import { useFirstPlayTutorial } from '@/hooks/useFirstPlayTutorial';
import { useTrainingAnalysis } from '@/hooks/useTrainingAnalysis';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAnnouncer } from '@/components/GameAnnouncer';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast } from '@/components/NeoToast';
import { awardComboCoins } from '@/utils/coinManager';
import { hapticForWordScore, hapticError } from '@/utils/haptics';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { finalizeWordValidation } from '@/utils/wordValidationAPI';
import { selectRandomRevealWord, getRevealableWordCount } from '@/utils/wordPathFinder';
import {
  calculateFinalAchievements,
  type WordData as AchievementWordData,
} from '@/utils/singlePlayerAchievements';
import type { LetterGrid, Language } from '@/shared/types/game';

// ==================== Types ====================

export interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean | null;
  comboBonus?: number;
  fireRoundBonus?: number;
}

export interface BotOpponent {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type SinglePlayerMode = 'solo' | 'solo-bots' | 'challenge' | 'practice' | 'daily';

export interface SinglePlayerGameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  timerSeconds: number;
  language: Language;
  mode: SinglePlayerMode;
  bots: BotOpponent[];
  minWordLength?: number;
}

export interface SinglePlayerResultsData {
  playerScore: number;
  playerWords: string[];
  playerWordData: Array<{
    word: string;
    score: number;
    timestamp: number;
    timeSinceStart: number;
    isValid: boolean;
    comboBonus: number;
    fireRoundBonus: number;
  }>;
  gameDuration: number;
  botScores: Array<{ name: string; score: number; words: string[] }>;
  grid: LetterGrid;
  allPossibleWords: string[];
  isNewHighScore: boolean;
  achievements: ReturnType<typeof calculateFinalAchievements>;
  botWordsForValidation: string[];
  gameSessionId: string;
  language: Language;
}

interface UseSinglePlayerGameOptions {
  settings: SinglePlayerGameSettings;
  targetHighScore: number | null;
  onGameEnd: (results: SinglePlayerResultsData) => void;
  onQuit: () => void;
  t: (key: string) => string;
}

// ==================== Constants ====================

const MIN_TRACKED_WORD_LENGTH = 5;
const SPAM_WINDOW_MS = 10000;
const SPAM_WARNING_THRESHOLD = 15;
const SPAM_COOLDOWN_THRESHOLD = 25;

// ==================== Hook ====================

export function useSinglePlayerGame({
  settings,
  targetHighScore,
  onGameEnd,
  onQuit,
  t,
}: UseSinglePlayerGameOptions) {
  // Sound effects
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

  // Core game state
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isValidatingWords, setIsValidatingWords] = useState(false);

  // Bot state
  const [botScores, setBotScores] = useState<Record<string, number>>({});
  const [botWords, setBotWords] = useState<Record<string, string[]>>({});

  // Available words from grid solver
  const [availableWords, setAvailableWords] = useState<{
    easy: string[];
    medium: string[];
    hard: string[];
  } | null>(null);

  // UI state
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<{
    id: string;
    type: 'accepted' | 'rejected' | 'pending';
    word: string;
    message?: string;
    score?: number;
    fireRoundActive?: boolean;
    fireRoundBonus?: number;
    timestamp: number;
  } | null>(null);
  const [isEarthquakePaused, setIsEarthquakePaused] = useState(false);
  const [comboCoinReward, setComboCoinReward] = useState<number | null>(null);
  const [showHintPrompt, setShowHintPrompt] = useState(false);
  const [progressBarExpanded, setProgressBarExpanded] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);

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
  const botUsedWordsRef = useRef<Record<string, Set<string>>>({});
  const availableWordsRef = useRef(availableWords);
  const gridVersionRef = useRef(0);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const gameStartTimeRef = useRef<number>(0);
  const submissionTimestampsRef = useRef<number[]>([]);
  const spamCooldownUntilRef = useRef<number>(0);
  const lastWordFoundTimeRef = useRef<number>(0);
  const showHintPromptRef = useRef(showHintPrompt);
  const botIntervalsDataRef = useRef<Map<string, number>>(new Map());

  // Refs for latest values
  const scoreRef = useRef(score);
  const foundWordsRef = useRef(foundWords);
  const botScoresRef = useRef(botScores);
  const botWordsRef = useRef(botWords);
  const gridRef = useRef(grid);
  const onGameEndRef = useRef(onGameEnd);

  // ==================== Combo System ====================

  const combo = useComboSystem({
    onComboSound: (level) => {
      if (level >= 2) {
        playComboSound(level);
      }
    },
    onComboMilestone: (level) => {
      const coinsAwarded = awardComboCoins(level, 'singleplayer');
      if (coinsAwarded > 0) {
        setComboCoinReward(coinsAwarded);
      }
    },
    trackMaxCombo: true,
  });

  // ==================== Training Systems ====================

  const trainingGridSize = useMemo(() => ({ rows: 5, cols: 5 }), []);
  const handleTrainingAnalysisComplete = useCallback(() => {}, []);
  const handleTrainingSkillUnlock = useCallback((skillId: string) => {
    console.log(`Skill unlocked: ${skillId}`);
  }, []);
  const handleTrainingComplete = useCallback(() => {
    setShowCompletionPopup(true);
  }, []);

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

  // ==================== Direction & Tutorial Systems ====================

  const directionGuidance = useDirectionPatternGuidance();

  const firstPlayTutorial = useFirstPlayTutorial({
    grid,
    availableWords,
    language: settings.language,
    isGameActive: !!grid && !isPaused && !isGameOver,
  });

  // ==================== Timer ====================

  const timer = useGameTimer({
    initialTime: settings.timerSeconds,
    isPaused: isPaused || settings.mode === 'practice',
    isExternallyPaused: isEarthquakePaused,
    autoStart: settings.mode !== 'practice',
    onTimeUp: () => {
      if (!gameOverCalledRef.current) {
        setIsGameOver(true);
      }
    },
  });

  // ==================== Earthquake/Fire Round ====================

  const handleEarthquakeTimerPause = useCallback(() => {
    setIsEarthquakePaused(true);
  }, []);

  const handleEarthquakeTimerResume = useCallback(() => {
    setIsEarthquakePaused(false);
  }, []);

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
    difficulty: settings.difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD',
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
    onFireRoundEnd: () => {
      stopFireCrackleLoop();
    },
    onTimerPause: handleEarthquakeTimerPause,
    onTimerResume: handleEarthquakeTimerResume,
  });

  // ==================== Navigation Guard ====================

  useNavigationGuard({
    enabled: !!grid && !isGameOver && score > 0,
    message: t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?',
    onNavigationAttempt: () => {
      setShowQuitConfirm(true);
      return false;
    },
  });

  // ==================== Keyboard Input ====================

  const keyboardInput = useKeyboardWordInput({
    grid: grid || ([] as LetterGrid),
    language: settings.language,
    gameLanguage: settings.language,
    enabled: !!grid && !isPaused && !isGameOver,
    onWordSubmit: useCallback((word: string) => {
      // This will be defined later and connected via ref
    }, []),
    minWordLength: settings.minWordLength ?? 3,
  });

  // ==================== Derived State ====================

  const gameActive = !!grid && !isPaused && !isGameOver && timer.remainingTime > 0;

  const totalBoardWords = useMemo(() => {
    if (!availableWords) return null;
    const allWords = new Set([
      ...availableWords.easy,
      ...availableWords.medium,
      ...availableWords.hard,
    ].filter(word => word.length >= MIN_TRACKED_WORD_LENGTH));
    return allWords.size;
  }, [availableWords]);

  const validWordsCount = useMemo(
    () => foundWords.filter(fw => fw.isValid === true).length,
    [foundWords]
  );

  const revealableWordCount = useMemo(() => {
    if (!availableWords || !grid) return 0;
    const foundWordsList = foundWords.filter(fw => fw.isValid === true).map(fw => fw.word);
    return getRevealableWordCount(availableWords, foundWordsList, settings.language);
  }, [availableWords, foundWords, grid, settings.language]);

  // ==================== Ref Syncs ====================

  useEffect(() => {
    scoreRef.current = score;
    foundWordsRef.current = foundWords;
    botScoresRef.current = botScores;
    botWordsRef.current = botWords;
    gridRef.current = grid;
    availableWordsRef.current = availableWords;
    onGameEndRef.current = onGameEnd;
  }, [score, foundWords, botScores, botWords, grid, availableWords, onGameEnd]);

  useEffect(() => {
    showHintPromptRef.current = showHintPrompt;
  }, [showHintPrompt]);

  useEffect(() => {
    gameStartTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, [setGameActive]);

  // ==================== Scoring Helpers ====================

  const getComboBonus = useCallback((comboLevel: number, wordLength: number): number => {
    if (comboLevel <= 0) return 0;

    let wordLengthFactor: number;
    if (wordLength <= 3) {
      wordLengthFactor = 0.2;
    } else if (wordLength === 4) {
      wordLengthFactor = 0.5;
    } else if (wordLength === 5) {
      wordLengthFactor = 1.0;
    } else if (wordLength === 6) {
      wordLengthFactor = 1.5;
    } else {
      wordLengthFactor = 2.0;
    }

    const baseBonus = Math.min(comboLevel, 10);
    return Math.floor(baseBonus * wordLengthFactor);
  }, []);

  const calculateWordScore = useCallback((wordLength: number, currentComboLevel: number): number => {
    const baseScore = Math.max(wordLength - 1, 1);
    const comboBonus = getComboBonus(currentComboLevel, wordLength);
    const multiplier = getScoreMultiplier();
    return (baseScore + comboBonus) * multiplier;
  }, [getComboBonus, getScoreMultiplier]);

  // ==================== Path Submit Handler ====================

  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    directionGuidance.trackWordPath(cells);
    firstPlayTutorial.trackUserPath(cells);
    trainingAnalysisTrackPath(cells);
    trainingTrackPath(cells);
  }, [directionGuidance, firstPlayTutorial, trainingAnalysisTrackPath, trainingTrackPath]);

  // ==================== Word Submit Handler ====================

  const handleWordSubmit = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    const minWordLength = settings.minWordLength ?? 3;
    const now = Date.now();

    // Abuse detection
    if (spamCooldownUntilRef.current > now) {
      const remaining = Math.ceil((spamCooldownUntilRef.current - now) / 1000);
      wordErrorToast(t('playerView.slowDown') || `Slow down! Wait ${remaining}s`, { duration: 1500 });
      return;
    }

    submissionTimestampsRef.current = submissionTimestampsRef.current.filter(
      ts => now - ts < SPAM_WINDOW_MS
    );
    submissionTimestampsRef.current.push(now);

    const submissionCount = submissionTimestampsRef.current.length;

    if (submissionCount >= SPAM_COOLDOWN_THRESHOLD) {
      spamCooldownUntilRef.current = now + 3000;
      wordErrorToast(t('playerView.tooFast') || 'Too fast! 3s cooldown', { duration: 2000 });
      combo.resetCombo();
      return;
    }

    if (submissionCount === SPAM_WARNING_THRESHOLD) {
      wordErrorToast(t('playerView.submittingTooFast') || 'Submitting too fast!', { duration: 1500 });
    }

    // Local validation
    const localValidation = validateWordLocally(
      normalizedWord,
      settings.language,
      minWordLength,
      foundWords.map(fw => ({ word: fw.word, isValid: fw.isValid }))
    );

    if (!localValidation.isValid) {
      const errorKey = localValidation.errorKey ?? 'Invalid word';
      let msg = t(errorKey) || errorKey;
      if (localValidation.errorParams?.min) {
        msg = msg.replace('${min}', String(localValidation.errorParams.min));
      }
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, msg);
      combo.resetCombo();
      return;
    }

    // Board validation
    const currentGrid = gridRef.current;
    if (!currentGrid || !isWordOnBoard(normalizedWord, currentGrid, settings.language)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard') || 'Word not on board';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: notOnBoardMsg,
        timestamp: now,
      });
      hapticError();
      announceWordResult(normalizedWord, false, undefined, notOnBoardMsg);
      combo.resetCombo();
      return;
    }

    // Duplicate check
    if (foundWordsSetRef.current.has(normalizedWord)) {
      const alreadyFoundMsg = t('playerView.wordAlreadyFound') || 'Already found!';
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: alreadyFoundMsg,
        timestamp: now,
      });
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

    const newWord: FoundWord = {
      word: normalizedWord,
      score: baseScore,
      timestamp: now,
      timeSinceStart,
      isValid: null,
    };

    foundWordsRef.current = [...foundWordsRef.current, newWord];
    setFoundWords(foundWordsRef.current);

    // Dictionary validation
    fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language: settings.language }),
    })
      .then(res => {
        if (!res.ok) {
          return { isValid: false, source: 'pending' };
        }
        return res.json();
      })
      .then(result => {
        if (result.isValid) {
          const wordLenScore = Math.max(normalizedWord.length - 1, 1);
          const comboBonus = getComboBonus(currentCombo, normalizedWord.length);
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

          if (combo.validWordCount > 1) {
            playComboSound(currentCombo + 1);
          }

          setCurrentFeedback({
            id: `accept-${now}`,
            type: 'accepted',
            word: normalizedWord.toUpperCase(),
            score: fullScore,
            fireRoundActive,
            fireRoundBonus,
            timestamp: now,
          });
          announceWordResult(normalizedWord, true, fullScore);
          announceCombo(currentCombo + 1);
        } else {
          combo.resetCombo();
          setCurrentFeedback({
            id: `pending-${now}`,
            type: 'pending',
            word: normalizedWord.toUpperCase(),
            timestamp: now,
          });
        }
      })
      .catch(() => {
        combo.resetCombo();
        setCurrentFeedback({
          id: `pending-${Date.now()}`,
          type: 'pending',
          word: normalizedWord.toUpperCase(),
          timestamp: Date.now(),
        });
      });
  }, [
    settings.language,
    settings.minWordLength,
    foundWords,
    t,
    playWordAcceptedSound,
    playComboSound,
    announceWordResult,
    announceCombo,
    combo,
    getComboBonus,
    getScoreMultiplier,
    fireRoundActive,
    calculateWordScore,
    trainingAnalysisTrackValidWord,
    trainingTrackValidWord,
  ]);

  // ==================== Word Change Handler ====================

  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // ==================== Quit Handler ====================

  const handleQuitRequest = useCallback(() => {
    if (settings.mode === 'practice') {
      setIsGameOver(true);
      return;
    }

    if (score > 0) {
      setShowQuitConfirm(true);
    } else {
      onQuit();
    }
  }, [score, onQuit, settings.mode]);

  // ==================== Finish Practice Handler ====================

  const handleFinishPractice = useCallback(() => {
    setIsGameOver(true);
  }, []);

  // ==================== Reveal Handler ====================

  const handleReveal = useCallback(async () => {
    if (revealState.isLoading || !availableWords || !grid) return null;

    setRevealState(prev => ({ ...prev, isLoading: true }));

    const foundWordsList = foundWords.filter(fw => fw.isValid === true).map(fw => fw.word);
    const result = selectRandomRevealWord(availableWords, foundWordsList, grid, settings.language);

    if (!result) {
      setRevealState(prev => ({ ...prev, isLoading: false }));
      return null;
    }

    const { path } = result;

    setRevealState(prev => ({
      ...prev,
      revealsUsed: prev.revealsUsed + 1,
      isLoading: false,
      highlightedPath: path.map(p => ({ row: p.row, col: p.col })),
    }));

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setRevealState(prev => ({ ...prev, highlightedPath: [] }));
    }, 4000);

    return result;
  }, [revealState.isLoading, availableWords, grid, foundWords, settings.language]);

  // ==================== Toggle Pause ====================

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // ==================== Clear Coin Reward ====================

  const clearCoinReward = useCallback(() => {
    setComboCoinReward(null);
  }, []);

  // ==================== Toggle Progress Bar ====================

  const toggleProgressBar = useCallback(() => {
    setProgressBarExpanded(prev => !prev);
  }, []);

  // ==================== Dismiss Completion Popup ====================

  const dismissCompletionPopup = useCallback(() => {
    setShowCompletionPopup(false);
  }, []);

  // ==================== Grid Initialization ====================

  useEffect(() => {
    const difficultyConfig = DIFFICULTIES[settings.difficulty.toUpperCase() as keyof typeof DIFFICULTIES];
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
            body: JSON.stringify({
              language: settings.language,
              count: wordCount,
              minLength: 3,
              maxLength: maxWordLen,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            wordsToEmbed = data.words || [];
          }
        } catch (error) {
          console.warn('Failed to fetch themed words, using random grid:', error);
        }
      }

      const newGrid = generateRandomTable(rows, cols, settings.language, wordsToEmbed);
      setGrid(newGrid);
    };

    initGrid();

    // Initialize bot state
    const initialBotScores: Record<string, number> = {};
    const initialBotWords: Record<string, string[]> = {};
    settings.bots.forEach(bot => {
      initialBotScores[bot.id] = 0;
      initialBotWords[bot.id] = [];
    });
    setBotScores(initialBotScores);
    setBotWords(initialBotWords);

    const initialBotUsedWords: Record<string, Set<string>> = {};
    settings.bots.forEach(bot => {
      initialBotUsedWords[bot.id] = new Set();
    });
    botUsedWordsRef.current = initialBotUsedWords;
  }, [settings.difficulty, settings.language, settings.bots, settings.mode]);

  // ==================== Fetch Grid Words ====================

  useEffect(() => {
    if (!grid) return;

    gridVersionRef.current += 1;
    const currentVersion = gridVersionRef.current;

    const timeoutId = setTimeout(() => {
      if (!availableWordsRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Grid solve API timed out (non-critical, using empty word list)');
        }
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    }, 5000);

    const fetchGridWords = async () => {
      try {
        const response = await fetch('/api/solve-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grid,
            language: settings.language,
          }),
        });

        if (currentVersion !== gridVersionRef.current) return;

        if (!response.ok) {
          console.warn(`Grid solve API returned ${response.status}`);
          setAvailableWords({ easy: [], medium: [], hard: [] });
          return;
        }

        const result = await response.json();
        if (result.success && result.words) {
          setAvailableWords(result.words);
        } else {
          setAvailableWords({ easy: [], medium: [], hard: [] });
        }
      } catch (error) {
        console.error('Failed to fetch grid words:', error);
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    };

    fetchGridWords();

    return () => clearTimeout(timeoutId);
  }, [grid, settings.language]);

  // ==================== Game Over Handler ====================

  useEffect(() => {
    if (!isGameOver || gameOverCalledRef.current || !gridRef.current) return;

    gameOverCalledRef.current = true;
    botIntervalsRef.current.forEach(clearInterval);

    const finalizeAndEndGame = async () => {
      const currentWords = foundWordsRef.current;
      setIsValidatingWords(true);

      const finalWords = await finalizeWordValidation(currentWords, settings.language, 3);
      setIsValidatingWords(false);

      const validWords = finalWords.filter(w => w.isValid === true);
      const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);

      const actualGameDuration = settings.mode === 'practice'
        ? Math.max(1, Math.floor((Date.now() - gameStartTimeRef.current) / 1000))
        : settings.timerSeconds;

      const validWordData: AchievementWordData[] = validWords.map(w => ({
        word: w.word,
        score: w.score,
        timestamp: w.timestamp,
        timeSinceStart: w.timeSinceStart,
        isValid: true,
        comboBonus: w.comboBonus,
      }));

      const allWordData: AchievementWordData[] = finalWords.map(w => ({
        word: w.word,
        score: w.score,
        timestamp: w.timestamp,
        timeSinceStart: w.timeSinceStart,
        isValid: w.isValid === true,
        comboBonus: w.comboBonus,
      }));

      const finalAchievements = calculateFinalAchievements(
        validWordData,
        allWordData,
        actualGameDuration,
        combo.maxCombo
      );

      const gameSessionId = crypto.randomUUID();

      // Collect words for validation modal (community voting)
      // 1. Bot words that are actual dictionary words (not fallback format like "word5")
      const allBotWords = settings.bots.flatMap(bot => {
        const words = botWordsRef.current[bot.id] || [];
        return words.filter(word => !word.match(/^word\d+$/));
      });

      // 2. Player's invalid/pending words (non-dictionary words they submitted)
      // These need community voting to potentially be added to the dictionary
      const playerPendingWords = finalWords
        .filter(w => !w.isValid)
        .map(w => w.word);

      // Combine both sources: bot words (to validate dictionary quality) + player words (to expand dictionary)
      const combinedWordsForValidation = [...new Set([...allBotWords, ...playerPendingWords])];

      // Randomly select up to 5 words for validation
      const shuffledWords = combinedWordsForValidation.sort(() => Math.random() - 0.5);
      const botWordsForValidation = shuffledWords.slice(0, 5);

      // Log for debugging community word collection
      if (process.env.NODE_ENV === 'development') {
        console.log('[useSinglePlayerGame] Words for validation:', {
          botWords: allBotWords.length,
          playerPendingWords: playerPendingWords.length,
          combined: combinedWordsForValidation.length,
          selected: botWordsForValidation.length,
        });
      }

      const results: SinglePlayerResultsData = {
        playerScore: finalScore,
        playerWords: validWords.map(w => w.word),
        playerWordData: finalWords.map(w => ({
          word: w.word,
          score: w.isValid ? w.score : 0,
          timestamp: w.timestamp,
          timeSinceStart: w.timeSinceStart,
          isValid: w.isValid === true,
          comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
          fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
        })),
        gameDuration: actualGameDuration,
        botScores: settings.bots.map(bot => ({
          name: bot.name,
          score: botScoresRef.current[bot.id] || 0,
          words: botWordsRef.current[bot.id] || [],
        })),
        grid: gridRef.current!,
        allPossibleWords: [],
        isNewHighScore: false,
        achievements: finalAchievements,
        botWordsForValidation,
        gameSessionId,
        language: settings.language,
      };

      if (settings.mode === 'practice') {
        trainingAnalysisFinishTraining();
      }

      onGameEndRef.current(results);
    };

    finalizeAndEndGame();
  }, [isGameOver, settings.bots, settings.language, settings.timerSeconds, combo.maxCombo, settings.mode, trainingAnalysisFinishTraining]);

  // ==================== Bot Simulation ====================

  const getBotInterval = useCallback((difficulty: 'easy' | 'medium' | 'hard', botId: string): number => {
    const cached = botIntervalsDataRef.current.get(botId);
    if (cached) return cached;

    const baseIntervals = { easy: 6000, medium: 3500, hard: 2000 };
    const randomFactors = { easy: 4000, medium: 3000, hard: 2000 };
    const interval = baseIntervals[difficulty] + Math.random() * randomFactors[difficulty];
    botIntervalsDataRef.current.set(botId, interval);
    return interval;
  }, []);

  const simulateBotFindWord = useCallback((bot: BotOpponent) => {
    const getBotWordScore = (wordLength: number): number => Math.max(wordLength - 1, 1);
    const currentAvailableWords = availableWordsRef.current;

    if (currentAvailableWords) {
      const wordPool = currentAvailableWords[bot.difficulty] || [];
      const usedWords = botUsedWordsRef.current[bot.id] || new Set();
      const unusedWords = wordPool.filter(w => !usedWords.has(w));

      if (unusedWords.length > 0) {
        const word = unusedWords[Math.floor(Math.random() * unusedWords.length)];
        const wordScore = getBotWordScore(word.length);

        usedWords.add(word);
        botUsedWordsRef.current[bot.id] = usedWords;

        setBotScores(prev => ({
          ...prev,
          [bot.id]: (prev[bot.id] || 0) + wordScore,
        }));

        setBotWords(prev => ({
          ...prev,
          [bot.id]: [...(prev[bot.id] || []), word],
        }));
        return;
      }
    }

    const wordLengths = { easy: [3, 4, 5], medium: [4, 5, 6], hard: [5, 6, 7, 8] };
    const lengths = wordLengths[bot.difficulty];
    const length = lengths[Math.floor(Math.random() * lengths.length)];
    const wordScore = getBotWordScore(length);

    setBotScores(prev => ({
      ...prev,
      [bot.id]: (prev[bot.id] || 0) + wordScore,
    }));

    setBotWords(prev => ({
      ...prev,
      [bot.id]: [...(prev[bot.id] || []), `word${length}`],
    }));
  }, []);

  useEffect(() => {
    if (settings.mode !== 'solo-bots' || isPaused || settings.bots.length === 0 || isGameOver) return;
    if (!availableWords) return;

    botIntervalsDataRef.current.clear();

    settings.bots.forEach(bot => {
      const interval = getBotInterval(bot.difficulty, bot.id);
      const botInterval = setInterval(() => {
        if (!isPaused) {
          simulateBotFindWord(bot);
        }
      }, interval);
      botIntervalsRef.current.push(botInterval);
    });

    return () => {
      botIntervalsRef.current.forEach(clearInterval);
      botIntervalsRef.current = [];
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [settings.mode, settings.bots, isPaused, isGameOver, availableWords, getBotInterval, simulateBotFindWord]);

  // ==================== Hint Prompt System ====================

  useEffect(() => {
    if (isPaused || isGameOver || !grid) return;

    const HINT_PROMPT_DELAY = 15000;

    if (lastWordFoundTimeRef.current === 0) {
      lastWordFoundTimeRef.current = Date.now();
    }

    const checkInactivity = setInterval(() => {
      const timeSinceLastWord = Date.now() - lastWordFoundTimeRef.current;
      if (timeSinceLastWord >= HINT_PROMPT_DELAY && !showHintPromptRef.current) {
        setShowHintPrompt(true);
      }
    }, 5000);

    return () => clearInterval(checkInactivity);
  }, [isPaused, isGameOver, grid]);

  // ==================== Training Progress Update ====================

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

  // ==================== Timer Announcer ====================

  useEffect(() => {
    if (gameActive) {
      announceTimer(timer.remainingTime);
    }
  }, [timer.remainingTime, gameActive, announceTimer]);

  // ==================== Heartbeat ====================

  useEffect(() => {
    const sessionId = crypto.randomUUID();

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/single-player/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            language: settings.language,
            mode: settings.mode,
          }),
        });
      } catch {
        // Silently ignore heartbeat failures
      }
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

  // ==================== Return ====================

  return {
    // Core state
    grid,
    score,
    foundWords,
    isPaused,
    isGameOver,
    isValidatingWords,
    gameActive,

    // Bot state
    botScores,
    botWords,

    // Timer state
    timer,

    // Combo state
    combo,
    comboCoinReward,
    clearCoinReward,

    // Earthquake/Fire state
    earthquakeState,
    fireRoundActive,
    fireRoundRemaining,

    // UI state
    formedWord,
    letterCount,
    currentFeedback,
    showQuitConfirm,
    setShowQuitConfirm,
    showHintPrompt,
    setShowHintPrompt,
    progressBarExpanded,
    toggleProgressBar,
    showCompletionPopup,
    dismissCompletionPopup,

    // Reveal state
    revealState,
    revealableWordCount,
    handleReveal,

    // Available words
    availableWords,
    totalBoardWords,
    validWordsCount,

    // Training state
    trainingCompletedSkills,
    trainingJustUnlocked,
    trainingIsComplete,
    trainingClearJustUnlocked,
    trainingAnalysisCurrentHint,
    trainingAnalysisDismissHint,
    trainingAnalysisHasPassed,

    // Direction guidance
    directionGuidance,

    // First play tutorial
    firstPlayTutorial,

    // Keyboard input
    keyboardInput,

    // Handlers
    handleWordSubmit,
    handlePathSubmit,
    handleWordChange,
    handleQuitRequest,
    handleFinishPractice,
    togglePause,

    // Settings
    settings,
    targetHighScore,

    // Refs for external use
    lastWordFoundTimeRef,
  };
}
