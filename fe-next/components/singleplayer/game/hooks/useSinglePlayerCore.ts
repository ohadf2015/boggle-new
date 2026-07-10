'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { selectRandomRevealWord, getRevealableWordCount } from '@/utils/wordPathFinder';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCosyMode, useSuppressTimerUrgency } from '@/contexts/AccessibilityContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useWordPace } from '@/hooks/useWordPace';
import { useAutoScrollOnGameStart } from '@/hooks/useAutoScrollOnGameStart';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useGiftModalPause } from '@/hooks/useGiftModalPause';
import { useRewardAdPause } from '@/hooks/useRewardAdPause';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { DIFFICULTIES } from '@/utils/consts';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast } from '@/components/NeoToast';
import { awardComboCoins } from '@/utils/coinManager';
import { hapticForWordScore, hapticError } from '@/utils/haptics';
import { recordNotInDictionary } from '@/utils/invalidWordTracker';
import { useAnnouncer } from '@/components/GameAnnouncer';
import { useDirectionPatternGuidance } from '@/hooks/useDirectionPatternGuidance';
import { useFirstPlayTutorial } from '@/hooks/useFirstPlayTutorial';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useTrainingAnalysis } from '@/hooks/useTrainingAnalysis';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import {
  checkLiveAchievements,
  createAchievementState,
  type SinglePlayerAchievement,
} from '@/utils/singlePlayerAchievements';
import { getComboBonus as calculateComboBonus, calculateWordScore as canonicalWordScore } from '@/shared/utils/scoring';
import { shouldPlayCountdownBeep } from '@/lib/cosy/cosyGameplay';
import { useBotSimulation } from './useBotSimulation';
import { useSpamDetection } from './useSpamDetection';
import { useSinglePlayerEffects } from './useSinglePlayerEffects';
import { buildGameResults, buildFallbackResults, emitSinglePlayerGameEnd } from './buildGameResults';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { SinglePlayerGameState, SinglePlayerResultsData } from '../../SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { FoundWord, TrainingState, DirectionGuidanceState, KeyboardInputState } from '../types';

interface UseSinglePlayerCoreOptions {
  settings: SinglePlayerGameState;
  targetHighScore: number | null;
  onGameEnd: (results: SinglePlayerResultsData) => void;
  onQuit: () => void;
  /**
   * True when `onQuit` resets in-app state and stays on the same URL (e.g.
   * Quick Play's arcade loop) rather than navigating away. Callers that
   * navigate (the default) must skip the guard's phantom history.go(-1) on
   * teardown — it would race the in-flight router.push and blank a Capacitor
   * WebView. Callers that stay on the page need the opposite: the phantom
   * MUST be popped, or every quit strands an extra same-URL history entry.
   */
  quitStaysOnPage?: boolean;
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
  settings, targetHighScore, onGameEnd, onQuit, quitStaysOnPage = false,
}: UseSinglePlayerCoreOptions) {
  const { t } = useLanguage();
  // Cozy / Calm Mode (single-player only): calmer bot pacing + no urgency cues.
  // Reward-neutral — neither changes how many words the player can find.
  const cosyMode = useCosyMode();
  const suppressTimerUrgency = useSuppressTimerUrgency();
  const {
    playWordAcceptedSound, playWordRejectedSound, playComboSound, playCountdownBeep,
    playEarthquakeRumble, playEarthquakeShake, playFireRoundStart, startFireCrackleLoop,
    stopFireCrackleLoop, setGameActive,
  } = useSoundEffects();
  const { announceWordResult, announceCombo, announceTimer } = useAnnouncer();
  const { isLowEnd } = useDevicePerformance();
  const { isDesktop, isTv } = useDesktopLayout();
  const isGiftModalOpen = useGiftModalPause();
  // Freeze the clock while the time-low rewarded ad covers the screen so it
  // can't tick to zero behind the ad (premature game-over + a too-late bonus).
  const isRewardAdActive = useRewardAdPause();

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
  // True once the player confirms a quit and we start navigating away (onQuit →
  // router push). Disarms the nav guard AND tells its teardown not to pop the
  // phantom history entry — a go(-1) racing the in-flight nav blanks the
  // Capacitor WebView (black screen on exit). See useNavigationGuard `leaving`.
  const [quitting, setQuitting] = useState(false);
  const [showHintPrompt, setShowHintPrompt] = useState(false);
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);
  const feedbackClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEarthquakePaused, setIsEarthquakePaused] = useState(false);
  const [progressBarExpanded, setProgressBarExpanded] = useState(false);
  const [comboCoinReward, setComboCoinReward] = useState<number | null>(null);
  const [liveAchievements, setLiveAchievements] = useState<SinglePlayerAchievement[]>([]);
  const achievementStateRef = useRef(createAchievementState());

  const [revealState, setRevealState] = useState<{
    revealsUsed: number; isLoading: boolean; highlightedPath: Array<{ row: number; col: number }>;
  }>({ revealsUsed: 0, isLoading: false, highlightedPath: [] });

  const availableWordsRef = useRef(availableWords);
  const gridVersionRef = useRef(0);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const foundWordsRef = useRef(foundWords);
  const botScoresRef = useRef<Record<string, number>>({});
  const botWordsRef = useRef<Record<string, string[]>>({});
  const gridRef = useRef(grid);
  const onGameEndRef = useRef(onGameEnd);
  const showHintPromptRef = useRef(showHintPrompt);
  const isTypingModeRef = useRef(false);
  const gameStatsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedbackClearTimerRef.current) {
      clearTimeout(feedbackClearTimerRef.current);
      feedbackClearTimerRef.current = null;
    }
    if (currentFeedback && ['accepted', 'rejected', 'duplicate'].includes(currentFeedback.type)) {
      feedbackClearTimerRef.current = setTimeout(() => {
        setCurrentFeedback(null);
        feedbackClearTimerRef.current = null;
      }, 1500);
    }
    return () => { if (feedbackClearTimerRef.current) clearTimeout(feedbackClearTimerRef.current); };
  }, [currentFeedback]);

  const { botScores, botWords, resetBots, initializeBotUsedWords } = useBotSimulation({
    mode: settings.mode, bots: settings.bots, isPaused, isGameOver, availableWords,
    calmPacing: cosyMode,
  });
  const { checkSubmission, resetSpamDetection } = useSpamDetection();
  const wordPace = useWordPace();
  const combo = useComboSystem({
    onComboSound: (level) => { if (level >= 2) playComboSound(level); },
    onComboMilestone: (level) => {
      const coinsAwarded = awardComboCoins(level, 'singleplayer');
      if (coinsAwarded > 0) setComboCoinReward(coinsAwarded);
    },
    trackMaxCombo: true,
    timerIntervalMs: isLowEnd ? 500 : 250,
  });
  const directionGuidance = useDirectionPatternGuidance();
  const firstPlayTutorial = useFirstPlayTutorial({
    grid, availableWords, language: settings.language,
    isGameActive: !!grid && !isPaused && !isGameOver,
  });

  const trainingGridSize = useMemo(() => ({ rows: 4, cols: 4 }), []);
  const handleTrainingAnalysisComplete = useCallback(() => { }, []);
  const {
    trackPath: trainingAnalysisTrackPath, trackValidWord: trainingAnalysisTrackValidWord,
    currentHint: trainingAnalysisCurrentHint, dismissHint: trainingAnalysisDismissHint,
    finishTraining: trainingAnalysisFinishTraining, hasPassed: trainingAnalysisHasPassed,
  } = useTrainingAnalysis({
    enabled: settings.mode === 'practice', gridSize: trainingGridSize,
    onTrainingComplete: handleTrainingAnalysisComplete,
  });

  const handleTrainingSkillUnlock = useCallback((_skillId: string) => { /* noop */ }, []);
  // Training-mastered no longer interrupts the session with a popup.
  // Player keeps practicing until they tap Finish (manual) or quit;
  // PracticeResults is rendered by SinglePlayerView once phase flips to 'results'.
  const handleTrainingComplete = useCallback(() => { /* noop — no mid-game upsell */ }, []);
  const {
    completedSkills: trainingCompletedSkills, completedSkillsRef: trainingCompletedSkillsRef,
    justUnlocked: trainingJustUnlocked, isComplete: trainingIsComplete,
    clearJustUnlocked: trainingClearJustUnlocked, updateProgress: trainingUpdateProgress,
    trackPath: trainingTrackPath, trackValidWord: trainingTrackValidWord,
  } = useTrainingProgress({
    enabled: settings.mode === 'practice',
    onSkillUnlock: handleTrainingSkillUnlock, onComplete: handleTrainingComplete,
  });

  const timer = useGameTimer({
    initialTime: settings.timerSeconds,
    isPaused: isPaused || settings.mode === 'practice',
    isExternallyPaused: isEarthquakePaused || isGiftModalOpen || isRewardAdActive,
    autoStart: settings.mode !== 'practice',
    onTimeUp: () => { if (!gameOverCalledRef.current) setIsGameOver(true); },
  });

  useNavigationGuard({
    enabled: !!grid && !isGameOver && score > 0 && !quitting,
    // Only skip the phantom pop when quitting actually navigates away — a
    // caller that stays on the page (quitStaysOnPage) must have it popped,
    // or every confirmed quit strands an extra same-URL history entry.
    leaving: quitting && !quitStaysOnPage,
    message: t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?',
    onNavigationAttempt: () => { setShowQuitConfirm(true); return false; },
  });

  const gameActive = !!grid && !isPaused && !isGameOver && timer.remainingTime > 0;

  // Countdown beep in last 10 seconds — silenced under cosy (no panic cue).
  useEffect(() => {
    if (shouldPlayCountdownBeep({ gameActive, remainingTime: timer.remainingTime, suppressUrgency: suppressTimerUrgency })) {
      playCountdownBeep(timer.remainingTime);
    }
  }, [timer.remainingTime, gameActive, playCountdownBeep, suppressTimerUrgency]);

  useAutoScrollOnGameStart(gameStatsRef, { gameActive, isLandscape: false });
  useCrazyGamesLifecycle({ isGameActive: gameActive, isGameOver, score, maxCombo: combo.maxCombo });

  const effects = useSinglePlayerEffects({
    grid, isPaused, isGameOver, score, language: settings.language, mode: settings.mode,
    isLandscape: false, isDesktop, isTv, remainingTime: timer.remainingTime, gameActive,
    foundWords, timerSeconds: settings.timerSeconds,
    trainingCompletedSkillsRef, trainingUpdateProgress, announceTimer, setGameActive,
    onQuit, t, isTypingModeRef, showHintPromptRef, setShowHintPrompt, setShowQuitConfirm, setIsPaused,
  });

  const { earthquakeState, fireRoundActive, fireRoundRemaining, getScoreMultiplier } = useEarthquakeFireRound({
    enabled: settings.mode !== 'practice', gameDurationSeconds: settings.timerSeconds,
    currentTimeSeconds: timer.remainingTime, language: settings.language,
    difficulty: settings.difficulty, mode: 'singleplayer',
    onGridRegenerate: (newGrid) => { setGrid(newGrid); foundWordsSetRef.current.clear(); },
    onEarthquakeStart: () => { playEarthquakeRumble(); if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([150, 100, 150, 100, 200]); },
    onEarthquakeShake: () => { playEarthquakeShake(); if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([300, 150, 300, 150, 400, 150, 300]); },
    onFireRoundStart: () => { playFireRoundStart(); startFireCrackleLoop(); if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(200); },
    onFireRoundEnd: stopFireCrackleLoop,
    onTimerPause: () => setIsEarthquakePaused(true),
    onTimerResume: () => setIsEarthquakePaused(false),
  });

  useGameMusic({
    phase: 'playing', remainingTime: timer.remainingTime, totalTime: settings.timerSeconds,
    isPaused: isPaused || isGameOver || settings.mode === 'practice',
    enabled: settings.mode !== 'practice', earthquakeState,
    suppressUrgentMusic: suppressTimerUrgency,
  });

  const calculateWordScoreLocal = useCallback((word: string, currentComboLevel: number): number => {
    return canonicalWordScore(word, currentComboLevel, getScoreMultiplier());
  }, [getScoreMultiplier]);

  const handleWordSubmit = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    const minWordLength = settings.minWordLength ?? 2;
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

    const localValidation = validateWordLocally(normalizedWord, settings.language, minWordLength, foundWords.map(fw => ({ word: fw.word, isValid: fw.isValid })));
    if (!localValidation.isValid) {
      const errorKey = localValidation.errorKey ?? 'Invalid word';
      const params = localValidation.errorParams?.min
        ? { min: String(localValidation.errorParams.min) }
        : undefined;
      const msg = (params ? t(errorKey, params) : t(errorKey)) || errorKey;
      setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord, message: msg, timestamp: now });
      playWordRejectedSound(); hapticError(); announceWordResult(normalizedWord, false, undefined, msg); combo.resetCombo();
      return;
    }

    const currentGrid = gridRef.current;
    if (!currentGrid || !isWordOnBoard(normalizedWord, currentGrid, settings.language)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard') || 'Word not on board';
      setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord, message: notOnBoardMsg, timestamp: now });
      playWordRejectedSound(); hapticError(); announceWordResult(normalizedWord, false, undefined, notOnBoardMsg); combo.resetCombo();
      return;
    }

    if (foundWordsSetRef.current.has(normalizedWord)) {
      const alreadyFoundMsg = t('playerView.wordAlreadyFound') || 'Already found!';
      setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord, message: alreadyFoundMsg, timestamp: now });
      playWordRejectedSound(); hapticError(); announceWordResult(normalizedWord, false, undefined, alreadyFoundMsg); combo.resetCombo();
      return;
    }

    foundWordsSetRef.current.add(normalizedWord);
    const currentCombo = combo.comboLevelRef.current;
    const baseScore = calculateWordScoreLocal(normalizedWord, 0);
    const fullScore = calculateWordScoreLocal(normalizedWord, currentCombo);
    const timeSinceStart = (now - effects.gameStartTimeRef.current) / 1000;

    const newWord: FoundWord = { word: normalizedWord, score: baseScore, timestamp: now, timeSinceStart, isValid: null };
    foundWordsRef.current = [...foundWordsRef.current, newWord];
    setFoundWords(foundWordsRef.current);
    wordPace.recordWord();

    fetch('/api/dictionary/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language: settings.language }),
    })
      .then(res => res.ok ? res.json() : { isValid: false, source: 'error' })
      .then(result => {
        if (result.isValid) {
          const comboBonus = calculateComboBonus(currentCombo, normalizedWord.length);
          const scoreWithoutMultiplier = canonicalWordScore(normalizedWord, currentCombo, 1);
          const multiplier = getScoreMultiplier();
          const fireRoundBonus = multiplier > 1 ? scoreWithoutMultiplier : 0;

          foundWordsRef.current = foundWordsRef.current.map(fw =>
            fw.word === normalizedWord && fw.timestamp === now ? { ...fw, isValid: true, score: fullScore, comboBonus, fireRoundBonus } : fw
          );
          setFoundWords(foundWordsRef.current);
    wordPace.recordWord();
          setScore(prev => prev + fullScore);
          playWordAcceptedSound(); hapticForWordScore(normalizedWord.length);
          effects.lastWordFoundTimeRef.current = Date.now(); setShowHintPrompt(false);
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

          const validatedWords = foundWordsRef.current
            .filter(fw => fw.isValid === true)
            .map(fw => ({ word: fw.word, score: fw.score, timestamp: fw.timestamp, timeSinceStart: fw.timeSinceStart, isValid: true, comboBonus: fw.comboBonus }));
          const newAchievements = checkLiveAchievements(
            achievementStateRef.current, validatedWords, normalizedWord, true, timeSinceStart, currentCombo + 1, settings.timerSeconds
          );
          if (newAchievements.length > 0) setLiveAchievements(prev => [...prev, ...newAchievements]);
        } else {
          combo.resetCombo();
          foundWordsRef.current = foundWordsRef.current.map(fw =>
            fw.word === normalizedWord && fw.timestamp === now ? { ...fw, isValid: false, score: 0 } : fw
          );
          setFoundWords(foundWordsRef.current);
    wordPace.recordWord();
          const invalidMsg = t('playerView.invalidWord') || 'Not a valid word';
          setCurrentFeedback({ id: `reject-${now}`, type: 'rejected', word: normalizedWord.toUpperCase(), message: invalidMsg, timestamp: now });
          playWordRejectedSound(); hapticError(); announceWordResult(normalizedWord, false, undefined, invalidMsg);
          recordNotInDictionary(normalizedWord, settings.language, 'single_player');
        }
      })
      .catch(() => {
        combo.resetCombo();
        foundWordsRef.current = foundWordsRef.current.map(fw =>
          fw.word === normalizedWord && fw.timestamp === now ? { ...fw, isValid: false, score: 0 } : fw
        );
        setFoundWords(foundWordsRef.current);
    wordPace.recordWord();
        const invalidMsg = t('playerView.invalidWord') || 'Not a valid word';
        setCurrentFeedback({ id: `reject-${Date.now()}`, type: 'rejected', word: normalizedWord.toUpperCase(), message: invalidMsg, timestamp: Date.now() });
        playWordRejectedSound(); hapticError();
      });
  }, [settings.language, settings.minWordLength, settings.timerSeconds, foundWords, t, playWordAcceptedSound, playWordRejectedSound, playComboSound, announceWordResult, announceCombo, combo, getScoreMultiplier, fireRoundActive, calculateWordScoreLocal, trainingAnalysisTrackValidWord, trainingTrackValidWord, checkSubmission, effects.gameStartTimeRef, effects.lastWordFoundTimeRef, wordPace]);

  const keyboardInput = useKeyboardWordInput({
    grid: grid || ([] as LetterGrid), language: settings.language, gameLanguage: settings.language,
    enabled: !!grid && !isPaused && !isGameOver, onWordSubmit: handleWordSubmit,
    minWordLength: settings.minWordLength ?? 2,
  });

  useEffect(() => {
    foundWordsRef.current = foundWords;
    botScoresRef.current = botScores; botWordsRef.current = botWords;
    gridRef.current = grid; availableWordsRef.current = availableWords;
    onGameEndRef.current = onGameEnd; showHintPromptRef.current = showHintPrompt;
    isTypingModeRef.current = keyboardInput.isTypingMode;
  }, [score, foundWords, botScores, botWords, grid, availableWords, onGameEnd, showHintPrompt, keyboardInput.isTypingMode]);

  useEffect(() => {
    const difficultyConfig = DIFFICULTIES[settings.difficulty];
    // Practice mode uses a smaller 4x4 grid for a gentler experience
    const rows = settings.mode === 'practice' ? 4 : difficultyConfig.rows;
    const cols = settings.mode === 'practice' ? 4 : difficultyConfig.cols;
    const totalCells = rows * cols;
    const baseWordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    const wordCount = settings.mode === 'practice' ? Math.min(50, baseWordCount * 2) : baseWordCount;
    const maxWordLen = Math.min(12, Math.max(rows, cols));
    const initGrid = async () => {
      // If settings already has a grid (e.g. community board), use it directly
      if (settings.grid) {
        setGrid(settings.grid);
        return;
      }
      let wordsToEmbed: string[] = [];
      if (settings.language !== 'ja') {
        try {
          const response = await fetch('/api/themed-words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: settings.language, count: wordCount, minLength: 3, maxLength: maxWordLen }) });
          if (response.ok) { const data = await response.json(); wordsToEmbed = data.words || []; }
        } catch (error) { console.warn('Failed to fetch themed words:', error); }
      }
      setGrid(pickRichestBoardClient(
        () => generateRandomTable(rows, cols, settings.language, wordsToEmbed),
        settings.language
      ));
    };
    initGrid(); initializeBotUsedWords(settings.bots); resetBots(); resetSpamDetection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.difficulty, settings.language, settings.bots, settings.mode, initializeBotUsedWords, resetBots, resetSpamDetection]);

  useEffect(() => {
    if (!grid) return;
    gridVersionRef.current += 1;
    const currentVersion = gridVersionRef.current;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { if (!availableWordsRef.current) setAvailableWords({ easy: [], medium: [], hard: [] }); }, 5000);
    const fetchGridWords = async () => {
      try {
        const response = await fetch('/api/solve-grid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grid, language: settings.language }), signal: controller.signal });
        if (currentVersion !== gridVersionRef.current) return;
        if (!response.ok) { setAvailableWords({ easy: [], medium: [], hard: [] }); return; }
        const result = await response.json();
        if (result.success && result.words) setAvailableWords(result.words);
        else setAvailableWords({ easy: [], medium: [], hard: [] });
      } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setAvailableWords({ easy: [], medium: [], hard: [] }); }
    };
    fetchGridWords();
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [grid, settings.language]);

  useEffect(() => {
    if (!isGameOver || gameOverCalledRef.current || !grid) return;
    gameOverCalledRef.current = true;
    const resultParams = {
      foundWords: foundWordsRef.current, grid: grid!, bots: settings.bots,
      botScores: botScoresRef.current, botWords: botWordsRef.current,
      gameStartTime: effects.gameStartTimeRef.current, timerSeconds: settings.timerSeconds,
      maxCombo: combo.maxCombo, mode: settings.mode, language: settings.language,
      availableWords: availableWordsRef.current,
    };
    try {
      const results = buildGameResults(resultParams);
      emitSinglePlayerGameEnd(results, settings.mode);
      if (settings.mode === 'practice') trainingAnalysisFinishTraining();
      onGameEndRef.current(results);
    } catch (error) {
      console.error('Game end processing failed:', error);
      setIsValidatingWords(false);
      const fallback = buildFallbackResults(resultParams);
      emitSinglePlayerGameEnd(fallback, settings.mode);
      if (settings.mode === 'practice') trainingAnalysisFinishTraining();
      onGameEndRef.current(fallback);
    }
  }, [isGameOver, grid, settings.bots, settings.language, settings.timerSeconds, combo.maxCombo, settings.mode, trainingAnalysisFinishTraining, effects.gameStartTimeRef]);

  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    directionGuidance.trackWordPath(cells); firstPlayTutorial.trackUserPath(cells);
    trainingAnalysisTrackPath(cells); trainingTrackPath(cells);
  }, [directionGuidance, firstPlayTutorial, trainingAnalysisTrackPath, trainingTrackPath]);

  const handleWordChange = useCallback((word: string, count: number) => { setFormedWord(word); setLetterCount(count); }, []);
  const handleFinishPractice = useCallback(() => setIsGameOver(true), []);
  const handleQuitRequest = useCallback(() => {
    if (settings.mode === 'practice') { setIsGameOver(true); return; }
    trackGrowthEvent('game_abandon_attempted', { mode: settings.mode, score, hadScore: score > 0 });
    score > 0 ? setShowQuitConfirm(true) : onQuit();
  }, [score, onQuit, settings.mode]);
  // Confirm path: disarm the guard (leaving) BEFORE the exit nav so its teardown
  // doesn't race-cancel the router push (black screen on native). The score===0
  // path above skips this — the guard is already disabled (enabled needs score>0).
  const confirmQuit = useCallback(() => { setQuitting(true); onQuit(); }, [onQuit]);
  const handlePauseToggle = useCallback(() => { setIsPaused(prev => !prev); }, []);
  const handleCoinAnimationComplete = useCallback(() => { setComboCoinReward(null); }, []);
  const handleToggleProgressBar = useCallback(() => { setProgressBarExpanded(prev => !prev); }, []);

  const revealableWordCount = useMemo(() => {
    if (!availableWords || !grid) return 0;
    return getRevealableWordCount(availableWords, foundWords.filter(fw => fw.isValid === true).map(fw => fw.word), settings.language);
  }, [availableWords, foundWords, grid, settings.language]);

  const handleReveal = useCallback(async () => {
    if (revealState.isLoading || !availableWords || !grid) return null;
    setRevealState(prev => ({ ...prev, isLoading: true }));
    const foundWordsList = foundWords.filter(fw => fw.isValid === true).map(fw => fw.word);
    const result = selectRandomRevealWord(availableWords, foundWordsList, grid, settings.language);
    if (!result) { setRevealState(prev => ({ ...prev, isLoading: false })); return null; }
    setRevealState(prev => ({ ...prev, revealsUsed: prev.revealsUsed + 1, isLoading: false, highlightedPath: result.path.map(p => ({ row: p.row, col: p.col })) }));
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => { setRevealState(prev => ({ ...prev, highlightedPath: [] })); }, 4000);
    return result;
  }, [revealState.isLoading, availableWords, grid, foundWords, settings.language]);

  const totalBoardWords = useMemo(() => {
    if (!availableWords) return null;
    const allWords = new Set([...availableWords.easy, ...availableWords.medium, ...availableWords.hard].filter(word => word.length >= MIN_TRACKED_WORD_LENGTH));
    return allWords.size;
  }, [availableWords]);

  const trainingState: TrainingState | null = settings.mode === 'practice' ? {
    completedSkills: trainingCompletedSkills, justUnlocked: trainingJustUnlocked,
    isComplete: trainingIsComplete, currentHint: trainingAnalysisCurrentHint,
    hasPassed: trainingAnalysisHasPassed, clearJustUnlocked: trainingClearJustUnlocked,
    dismissHint: trainingAnalysisDismissHint,
  } : null;

  const directionGuidanceState: DirectionGuidanceState = {
    showDirectionGuidance: directionGuidance.showDirectionGuidance,
    dismissDirectionGuidance: directionGuidance.dismissDirectionGuidance,
  };

  const keyboardInputState: KeyboardInputState = {
    isTypingMode: keyboardInput.isTypingMode, typedWord: keyboardInput.typedWord,
    highlightedCells: keyboardInput.highlightedCells,
  };

  return {
    isLandscape: false, isDesktop, isTv,
    grid, foundWords, score, isPaused, isGameOver, isValidatingWords,
    timer, combo, comboCoinReward, handleCoinAnimationComplete,
    formedWord, letterCount, currentFeedback,
    keyboardInput: keyboardInputState,
    tutorialPath: firstPlayTutorial.tutorialPath, tutorialWord: firstPlayTutorial.tutorialWord,
    revealState, revealableWordCount, handleReveal,
    fireRoundActive, fireRoundRemaining, earthquakeState,
    showHintPrompt, setShowHintPrompt,
    directionGuidance: directionGuidanceState,
    training: trainingState, progressBarExpanded, handleToggleProgressBar,
    showQuitConfirm, setShowQuitConfirm,
    showLandscapeTutorial: effects.showLandscapeTutorial,
    dismissLandscapeTutorial: effects.dismissLandscapeTutorial,
    totalBoardWords, targetHighScore, liveAchievements,
    lastWordFoundTimeRef: effects.lastWordFoundTimeRef, gameStatsRef,
    handleWordSubmit, handlePathSubmit, handleWordChange,
    handlePauseToggle, handleFinishPractice, handleQuitRequest, onQuit, confirmQuit, t,
    wordPace,
  };
}
