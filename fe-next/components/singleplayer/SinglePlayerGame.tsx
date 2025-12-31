'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { ArrowLeft, Pause, Play, Crown, HelpCircle, TrendingUp, Target, Zap } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { Button } from '@/components/ui/button';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { EarthquakeWarning, FireRoundIndicator } from '@/components/earthquake';
import ThemeIndicator from '@/components/game/ThemeIndicator';
import { WordsProgress } from '@/player/components/in-game/WordsProgress';
import RevealButton from '@/components/singleplayer/RevealButton';
import { AchievementProgressTracker } from '@/components/achievements/AchievementProgressTracker';
import { selectRandomRevealWord, getRevealableWordCount } from '@/utils/wordPathFinder';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BoardTheme } from '@/shared/types/socket';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useAutoScrollOnGameStart } from '@/hooks/useAutoScrollOnGameStart';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { cn } from '@/lib/utils';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast } from '@/components/NeoToast';
import { useAnnouncer } from '@/components/GameAnnouncer';
import { useDirectionPatternGuidance } from '@/hooks/useDirectionPatternGuidance';
import DirectionGuidanceTooltip from '@/components/game/DirectionGuidanceTooltip';
import {
  calculateFinalAchievements,
  type WordData as AchievementWordData,
} from '@/utils/singlePlayerAchievements';
import { finalizeWordValidation } from '@/utils/wordValidationAPI';
import type { SinglePlayerGameState, SinglePlayerResultsData, BotOpponent } from './SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';

interface SinglePlayerGameProps {
  settings: SinglePlayerGameState;
  targetHighScore: number | null; // High score to beat in challenge mode
  onGameEnd: (results: SinglePlayerResultsData) => void;
  onQuit: () => void;
}

interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number; // Seconds since game start for pace analysis
  isValid: boolean | null; // null = pending validation
  comboBonus?: number; // Combo bonus points earned
  fireRoundBonus?: number; // Extra points from 2x fire round multiplier
}

/**
 * SinglePlayerGame - Core game component for single player mode
 * Handles grid interaction, timer, word validation, and bot simulation
 */
const SinglePlayerGame: React.FC<SinglePlayerGameProps> = ({
  settings,
  targetHighScore,
  onGameEnd,
  onQuit,
}) => {
  const { t } = useLanguage();
  const {
    playWordAcceptedSound,
    playComboSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  } = useSoundEffects();
  const { announceWordResult, announceCombo, announceTimer } = useAnnouncer();
  // Use shared hook for consistent landscape detection across multiplayer and single player
  // Only triggers on mobile devices (height <= 600px) to prevent desktop from using landscape layout
  const isLandscape = useMobileLandscape();
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [botScores, setBotScores] = useState<Record<string, number>>({});
  const [botWords, setBotWords] = useState<Record<string, string[]>>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [isValidatingWords, setIsValidatingWords] = useState(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme | null>(null);
  // Available words from grid solver for bots to use
  const [availableWords, setAvailableWords] = useState<{
    easy: string[];
    medium: string[];
    hard: string[];
  } | null>(null);
  // Track which words each bot has already used
  const botUsedWordsRef = useRef<Record<string, Set<string>>>({});
  // Ref to access current availableWords in callbacks (avoids stale closure)
  const availableWordsRef = useRef(availableWords);

  // Minimum word length for "Words Remaining" counter and hints
  // Only count/hint words with 5+ letters to reduce overwhelming large numbers
  const MIN_TRACKED_WORD_LENGTH = 5;

  // Calculate total board words from availableWords (only 5+ letter words)
  const totalBoardWords = React.useMemo(() => {
    if (!availableWords) return null;
    // Combine all words from easy, medium, and hard categories
    // Filter to only include words with 5+ letters
    const allWords = new Set([
      ...availableWords.easy,
      ...availableWords.medium,
      ...availableWords.hard,
    ].filter(word => word.length >= MIN_TRACKED_WORD_LENGTH));
    return allWords.size;
  }, [availableWords]);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showLandscapeTutorial, setShowLandscapeTutorial] = useState(false);
  const [hasShownFirstGameHelp, setHasShownFirstGameHelp] = useState(false);

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);

  // Feedback state (for WordFormingArea)
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

  // Earthquake pause state
  const [isEarthquakePaused, setIsEarthquakePaused] = useState(false);

  // Reveal word system state
  const [revealState, setRevealState] = useState<{
    revealsUsed: number;
    isLoading: boolean;
    highlightedPath: Array<{ row: number; col: number }>;
  }>({
    revealsUsed: 0,
    isLoading: false,
    highlightedPath: [],
  });

  // Track grid version for earthquake recalculation
  const gridVersionRef = useRef(0);

  // === SHARED HOOKS ===

  // Combo system - handles combo state, refs, and timeouts
  const combo = useComboSystem({
    onComboSound: (level) => {
      if (level >= 2) {
        playComboSound(level);
      }
    },
    trackMaxCombo: true,
  });

  // Direction pattern guidance - shows when player only uses straight-line directions
  const directionGuidance = useDirectionPatternGuidance();

  // Game timer - handles countdown with pause support
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

  // Ref for auto-scroll target (timer/stats section in portrait mode)
  const gameStatsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to game area on game start in portrait mode
  // Game is considered active when grid is loaded and not paused/game over
  const gameActive = !!grid && !isPaused && !isGameOver && timer.remainingTime > 0;
  useAutoScrollOnGameStart(gameStatsRef, {
    gameActive,
    isLandscape,
  });

  // Announce timer at key intervals for screen reader users
  useEffect(() => {
    if (gameActive) {
      announceTimer(timer.remainingTime);
    }
  }, [timer.remainingTime, gameActive, announceTimer]);

  // Remaining refs (not replaced by hooks)
  const botIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const gameStartTimeRef = useRef<number>(0); // Track when game started for pace analysis

  // Set game start time on mount
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
  }, []);

  // Abuse detection: track submission timestamps (like multiplayer's spamDetector)
  const submissionTimestampsRef = useRef<number[]>([]);
  const SPAM_WINDOW_MS = 10000; // 10-second window
  const SPAM_WARNING_THRESHOLD = 15; // Warn at 15 submissions in 10s
  const SPAM_COOLDOWN_THRESHOLD = 25; // Block at 25 submissions in 10s
  const spamCooldownUntilRef = useRef<number>(0);

  // Refs for latest values (to avoid stale closures)
  const scoreRef = useRef(score);
  const foundWordsRef = useRef(foundWords);
  const botScoresRef = useRef(botScores);
  const botWordsRef = useRef(botWords);
  const gridRef = useRef(grid);
  // Ref for onGameEnd callback to prevent race conditions in async effect
  const onGameEndRef = useRef(onGameEnd);

  // Keep refs in sync (consolidated into single effect)
  useEffect(() => {
    scoreRef.current = score;
    foundWordsRef.current = foundWords;
    botScoresRef.current = botScores;
    botWordsRef.current = botWords;
    gridRef.current = grid;
    availableWordsRef.current = availableWords;
    onGameEndRef.current = onGameEnd;
  }, [score, foundWords, botScores, botWords, grid, availableWords, onGameEnd]);


  // Single player heartbeat for admin visibility
  useEffect(() => {
    // Generate a unique session ID for this game session
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
        // Silently ignore heartbeat failures - not critical
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    // Cleanup: remove session on unmount
    return () => {
      clearInterval(interval);
      // Best-effort cleanup - don't wait for response
      fetch('/api/single-player/heartbeat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };
  }, [settings.language, settings.mode]);

  // Note: Music transitions are handled by useGameMusic hook in SinglePlayerView
  // which properly fades between tracks. We don't call stopMusic on unmount
  // because that would interfere with the transition to results/lobby music.

  // Landscape tutorial - show only once per device
  useEffect(() => {
    if (isLandscape && !isGameOver) {
      const hasSeenTutorial = localStorage.getItem('landscape-tutorial-seen');
      if (!hasSeenTutorial) {
        setShowLandscapeTutorial(true);
      }
    }
  }, [isLandscape, isGameOver]);

  // Auto-show help panel on first game - helps new players learn the mechanics
  useEffect(() => {
    if (!grid || isGameOver || hasShownFirstGameHelp) return undefined;

    const hasSeenHelp = localStorage.getItem('first-game-help-seen');
    if (!hasSeenHelp) {
      // Delay opening help panel by 1.5 seconds to let game UI settle
      const timer = setTimeout(() => {
        setIsHelpOpen(true);
        setHasShownFirstGameHelp(true);
        localStorage.setItem('first-game-help-seen', 'true');
      }, 1500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [grid, isGameOver, hasShownFirstGameHelp]);

  const dismissLandscapeTutorial = useCallback(() => {
    setShowLandscapeTutorial(false);
    localStorage.setItem('landscape-tutorial-seen', 'true');
  }, []);

  // Keyboard shortcuts for landscape mode
  useEffect(() => {
    if (!isLandscape || isGameOver) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (score > 0) {
          setShowQuitConfirm(true);
        } else {
          onQuit();
        }
      } else if (e.key === ' ' && settings.mode !== 'practice') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsHelpOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLandscape, isGameOver, score, settings.mode, onQuit]);

  // Handle quit with confirmation
  const handleQuitRequest = useCallback(() => {
    if (score > 0) {
      setShowQuitConfirm(true);
    } else {
      onQuit();
    }
  }, [score, onQuit]);

  // Earthquake timer pause handlers (timer pause is handled by useGameTimer via isExternallyPaused)
  const handleEarthquakeTimerPause = useCallback(() => {
    setIsEarthquakePaused(true);
  }, []);

  const handleEarthquakeTimerResume = useCallback(() => {
    setIsEarthquakePaused(false);
  }, []);

  // Earthquake/Fire Round feature
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
      // Clear found words set when grid regenerates
      foundWordsSetRef.current.clear();
    },
    onEarthquakeStart: () => {
      // Play earthquake rumble sound with enhanced haptic feedback
      playEarthquakeRumble();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        // More dramatic vibration pattern for warning
        navigator.vibrate([150, 100, 150, 100, 200]);
      }
    },
    onEarthquakeShake: () => {
      // Play earthquake shake sound with brutal haptic
      playEarthquakeShake();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        // Brutal shake pattern - longer and more intense
        navigator.vibrate([300, 150, 300, 150, 400, 150, 300]);
      }
    },
    onFireRoundStart: () => {
      // Play fire round sounds and heavy haptic
      playFireRoundStart();
      startFireCrackleLoop();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
    },
    onFireRoundEnd: () => {
      // Stop fire round ambient sound
      stopFireCrackleLoop();
    },
    onTimerPause: handleEarthquakeTimerPause,
    onTimerResume: handleEarthquakeTimerResume,
  });

  // Use shared game music hook - handles in-game music, urgent music, earthquake music
  // Consistent with multiplayer: urgent music after 33% elapsed, bossa-arcade during earthquake
  useGameMusic({
    phase: 'playing',
    remainingTime: timer.remainingTime,
    totalTime: settings.timerSeconds,
    isPaused: isPaused || isGameOver || settings.mode === 'practice',
    enabled: settings.mode !== 'practice', // No timed music in practice mode
    earthquakeState,
  });

  // Generate grid on mount - fetch themed words first (except for Japanese)
  useEffect(() => {
    const difficultyConfig = DIFFICULTIES[settings.difficulty];
    const rows = difficultyConfig.rows;
    const cols = difficultyConfig.cols;
    const totalCells = rows * cols;
    const wordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    const maxWordLen = Math.min(12, Math.max(rows, cols));

    // Initialize grid generation
    const initGrid = async () => {
      let wordsToEmbed: string[] = [];

      // Fetch themed words for non-Japanese languages
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
            if (data.theme) {
              setBoardTheme(data.theme);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch themed words, using random grid:', error);
        }
      }

      const newGrid = generateRandomTable(rows, cols, settings.language, wordsToEmbed);
      setGrid(newGrid);
    };

    initGrid();

    // Initialize bot scores
    const initialBotScores: Record<string, number> = {};
    const initialBotWords: Record<string, string[]> = {};
    settings.bots.forEach(bot => {
      initialBotScores[bot.id] = 0;
      initialBotWords[bot.id] = [];
    });
    setBotScores(initialBotScores);
    setBotWords(initialBotWords);

    // Initialize bot used words tracking
    const initialBotUsedWords: Record<string, Set<string>> = {};
    settings.bots.forEach(bot => {
      initialBotUsedWords[bot.id] = new Set();
    });
    botUsedWordsRef.current = initialBotUsedWords;
  }, [settings.difficulty, settings.language, settings.bots]);

  // Fetch valid words from grid for bots and word progress tracking
  // Runs for ALL modes to support WordsProgress, not just solo-bots
  useEffect(() => {
    if (!grid) return;

    // Increment grid version to track earthquake regenerations
    gridVersionRef.current += 1;
    const currentVersion = gridVersionRef.current;

    // Set timeout to ensure we get words even if API is slow/fails
    const timeoutId = setTimeout(() => {
      if (!availableWordsRef.current) {
        console.warn('Grid solve API timed out');
        setAvailableWords({ easy: [], medium: [], hard: [] });
      }
    }, 5000); // 5 second timeout

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

        // Check if grid changed while fetching (ignore stale response)
        if (currentVersion !== gridVersionRef.current) return;

        // Check if response is OK before parsing JSON
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

  // Handle game over when isGameOver becomes true
  useEffect(() => {
    if (!isGameOver || gameOverCalledRef.current || !gridRef.current) return;

    gameOverCalledRef.current = true;

    // Clean up bot intervals (timer and combo handled by hooks)
    botIntervalsRef.current.forEach(clearInterval);

    // Validate pending words with AI before ending (same as multiplayer)
    // Uses batch API endpoint for efficiency - single request for all pending words
    const finalizeAndEndGame = async () => {
      const currentWords = foundWordsRef.current;

      // Show loading indicator while validating
      setIsValidatingWords(true);

      // Use shared utility for batch word validation
      const finalWords = await finalizeWordValidation(currentWords, settings.language, 3);

      // Validation complete
      setIsValidatingWords(false);

      // Calculate final score from validated words only
      const validWords = finalWords.filter(w => w.isValid === true);
      const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);

      // Convert to achievement word data format
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

      // Calculate final achievements (not saved to profile - single player only)
      const finalAchievements = calculateFinalAchievements(
        validWordData,
        allWordData,
        settings.timerSeconds,
        combo.maxCombo
      );

      // Generate a unique session ID for this game (used for vote tracking)
      const gameSessionId = crypto.randomUUID();

      // Collect bot words for validation modal
      // Get all unique bot words that are actual words (not fallback format like "word5")
      const allBotWords = settings.bots.flatMap(bot => {
        const words = botWordsRef.current[bot.id] || [];
        return words.filter(word => !word.match(/^word\d+$/)); // Filter out fallback format
      });
      // Dedupe and limit to reasonable number for validation
      const uniqueBotWords = [...new Set(allBotWords)];
      // Randomly select up to 5 words for validation to avoid overwhelming the user
      const shuffledBotWords = uniqueBotWords.sort(() => Math.random() - 0.5);
      const botWordsForValidation = shuffledBotWords.slice(0, 5);

      const results: SinglePlayerResultsData = {
        playerScore: finalScore,
        playerWords: validWords.map(w => w.word),
        // Include ALL words (valid and invalid) so results page can display invalid words too
        playerWordData: finalWords.map(w => ({
          word: w.word,
          score: w.isValid ? w.score : 0,
          timestamp: w.timestamp,
          timeSinceStart: w.timeSinceStart,
          isValid: w.isValid === true,
          comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
          fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
        })),
        gameDuration: settings.timerSeconds,
        botScores: settings.bots.map(bot => ({
          name: bot.name,
          score: botScoresRef.current[bot.id] || 0,
          words: botWordsRef.current[bot.id] || [],
        })),
        grid: gridRef.current!,
        allPossibleWords: [],
        isNewHighScore: false,
        achievements: finalAchievements,
        // Include bot words for validation and session ID for vote tracking
        botWordsForValidation,
        gameSessionId,
        language: settings.language,
      };

      // Use ref to call onGameEnd - ensures we always have latest callback
      // and avoids race conditions with effect cleanup during async operations
      onGameEndRef.current(results);
    };

    finalizeAndEndGame();
    // No cleanup needed - we use ref pattern instead of isMounted check
  }, [isGameOver, settings.bots, settings.language, settings.timerSeconds, combo.maxCombo]);

  // Timer is now handled by useGameTimer hook (lines 126-136)

  // Bot interval helper - use refs for random intervals to avoid impure function in effect
  const botIntervalsDataRef = useRef<Map<string, number>>(new Map());
  const getBotInterval = useCallback((difficulty: 'easy' | 'medium' | 'hard', botId: string): number => {
    // Check if we already have an interval for this bot
    const cached = botIntervalsDataRef.current.get(botId);
    if (cached) return cached;

    const baseIntervals = {
      easy: 6000,
      medium: 3500,
      hard: 2000,
    };
    const randomFactors = {
      easy: 4000,
      medium: 3000,
      hard: 2000,
    };
    const interval = baseIntervals[difficulty] + Math.random() * randomFactors[difficulty];
    botIntervalsDataRef.current.set(botId, interval);
    return interval;
  }, []);

  const simulateBotFindWord = useCallback((bot: BotOpponent) => {
    // Simple scoring for bots: word length - 1 (no fire round multiplier, no combos)
    const getBotWordScore = (wordLength: number): number => Math.max(wordLength - 1, 1);

    // Use ref to get current availableWords (avoids stale closure)
    const currentAvailableWords = availableWordsRef.current;

    // Try to use real words from the grid solver
    if (currentAvailableWords) {
      // Get words for this bot's difficulty
      const wordPool = currentAvailableWords[bot.difficulty] || [];
      const usedWords = botUsedWordsRef.current[bot.id] || new Set();

      // Find an unused word
      const unusedWords = wordPool.filter(w => !usedWords.has(w));

      if (unusedWords.length > 0) {
        // Pick a random unused word
        const word = unusedWords[Math.floor(Math.random() * unusedWords.length)];
        const wordScore = getBotWordScore(word.length);

        // Mark word as used by this bot
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

    // Fallback: simulate with random word lengths if no words available
    const wordLengths = {
      easy: [3, 4, 5],
      medium: [4, 5, 6],
      hard: [5, 6, 7, 8],
    };
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

  // Bot simulation effect - wait for availableWords before starting
  // This ensures bots use actual words from the grid solver instead of placeholders
  useEffect(() => {
    if (settings.mode !== 'solo-bots' || isPaused || settings.bots.length === 0 || isGameOver) return;
    // Wait for availableWords to be fetched before starting bot simulation
    // This prevents bots from using fallback placeholder words
    if (!availableWords) return;

    // Clear cached intervals for fresh game
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
    };
  }, [settings.mode, settings.bots, isPaused, isGameOver, availableWords, getBotInterval, simulateBotFindWord]);

  // Get combo bonus based on combo level and word length - matches backend scoring engine
  const getComboBonus = useCallback((comboLevel: number, wordLength: number): number => {
    if (comboLevel <= 0) return 0;

    // Word length factor - longer words get better combo bonuses
    let wordLengthFactor: number;
    if (wordLength <= 3) {
      wordLengthFactor = 0.2;  // Very short words - minimal combo bonus
    } else if (wordLength === 4) {
      wordLengthFactor = 0.5;  // Short words - modest combo bonus
    } else if (wordLength === 5) {
      wordLengthFactor = 1.0;  // Medium words - full base bonus
    } else if (wordLength === 6) {
      wordLengthFactor = 1.5;  // Good words - 1.5x bonus
    } else {
      wordLengthFactor = 2.0;  // Long words (7+) - 2x bonus
    }

    const baseBonus = Math.min(comboLevel, 10);
    return Math.floor(baseBonus * wordLengthFactor);
  }, []);

  const calculateWordScore = useCallback((wordLength: number, currentComboLevel: number): number => {
    // Base score: word length - 1 (matches multiplayer scoring)
    const baseScore = Math.max(wordLength - 1, 1);
    // Combo bonus based on combo level and word length (matches backend formula)
    const comboBonus = getComboBonus(currentComboLevel, wordLength);
    // Fire round multiplier (2x during fire round, 1x otherwise)
    const multiplier = getScoreMultiplier();
    return (baseScore + comboBonus) * multiplier;
  }, [getComboBonus, getScoreMultiplier]);


  // Memoize word submission handler to prevent recreation on every render
  const handleWordSubmit = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    // Use minWordLength from settings (EASY presets use 2, others use 3)
    const minWordLength = settings.minWordLength ?? 3;
    const now = Date.now();

    // Abuse detection: check if on cooldown
    if (spamCooldownUntilRef.current > now) {
      const remaining = Math.ceil((spamCooldownUntilRef.current - now) / 1000);
      wordErrorToast(t('playerView.slowDown') || `Slow down! Wait ${remaining}s`, { duration: 1500 });
      return;
    }

    // Prune old timestamps and add new one
    submissionTimestampsRef.current = submissionTimestampsRef.current.filter(
      ts => now - ts < SPAM_WINDOW_MS
    );
    submissionTimestampsRef.current.push(now);

    const submissionCount = submissionTimestampsRef.current.length;

    // Check for spam cooldown
    if (submissionCount >= SPAM_COOLDOWN_THRESHOLD) {
      spamCooldownUntilRef.current = now + 3000; // 3-second cooldown
      wordErrorToast(t('playerView.tooFast') || 'Too fast! 3s cooldown', { duration: 2000 });
      // Reset combo on spam cooldown
      combo.resetCombo();
      return;
    }

    // Warning for approaching limit
    if (submissionCount === SPAM_WARNING_THRESHOLD) {
      wordErrorToast(t('playerView.submittingTooFast') || 'Submitting too fast!', { duration: 1500 });
    }

    // Step 1: Local validation (quick checks) - same as multiplayer
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
      // Show notification in dedicated area
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: msg,
        timestamp: now,
      });
      announceWordResult(normalizedWord, false, undefined, msg);
      // Reset combo on invalid word submission (consistent with multiplayer behavior)
      combo.resetCombo();
      return;
    }

    // Step 2: Check if word exists as a valid path on the board - same as multiplayer
    // Use gridRef.current to ensure we always validate against the latest grid
    // (important during fire round when grid is regenerated)
    const currentGrid = gridRef.current;
    if (!currentGrid || !isWordOnBoard(normalizedWord, currentGrid, settings.language)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard') || 'Word not on board';
      // Show notification in dedicated area
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: notOnBoardMsg,
        timestamp: now,
      });
      announceWordResult(normalizedWord, false, undefined, notOnBoardMsg);
      // Reset combo on invalid word submission (consistent with multiplayer behavior)
      combo.resetCombo();
      return;
    }

    // Step 3: Check for duplicates - same as multiplayer
    // MUST reset combo when duplicate is submitted (consistent with multiplayer behavior)
    if (foundWordsSetRef.current.has(normalizedWord)) {
      const alreadyFoundMsg = t('playerView.wordAlreadyFound') || 'Already found!';
      // Show notification in dedicated area
      setCurrentFeedback({
        id: `reject-${now}`,
        type: 'rejected',
        word: normalizedWord,
        message: alreadyFoundMsg,
        timestamp: now,
      });
      announceWordResult(normalizedWord, false, undefined, alreadyFoundMsg);
      // Reset combo on duplicate submission
      combo.resetCombo();
      return;
    }

    // Add to set immediately to prevent double submission
    foundWordsSetRef.current.add(normalizedWord);

    const currentCombo = combo.comboLevelRef.current;
    const baseScore = calculateWordScore(normalizedWord.length, 0); // Base score without combo
    const fullScore = calculateWordScore(normalizedWord.length, currentCombo); // Score with combo
    const timeSinceStart = (now - gameStartTimeRef.current) / 1000;

    // Step 4: Add word with pending state and BASE score (no combo yet)
    // Score will be updated if validated (like multiplayer's async socket)
    const newWord = {
      word: normalizedWord,
      score: baseScore, // Start with base score, updated if validated with combo
      timestamp: now,
      timeSinceStart,
      isValid: null as boolean | null, // Pending - will update after dictionary check
    };
    // Update ref immediately to avoid race condition when game ends right after word submission
    // (useEffect sync may not have run yet when game-over effect reads the ref)
    foundWordsRef.current = [...foundWordsRef.current, newWord];
    setFoundWords(foundWordsRef.current);

    // Step 5: Check dictionary via backend API (same validation as multiplayer)
    // Uses /api/dictionary/check which supports all languages (EN, HE, SV, ES, JA)
    // Combo and score only added AFTER validation (like multiplayer)
    fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language: settings.language }),
    })
      .then(res => {
        if (!res.ok) {
          // API error - treat as pending for AI validation at game end
          return { isValid: false, source: 'pending' };
        }
        return res.json();
      })
      .then(result => {
        if (result.isValid) {
          // Word is in dictionary/community - valid immediately (like multiplayer's handleValidatedWord)
          // Calculate combo bonus and fire round bonus separately using backend-matching formula
          const wordLenScore = Math.max(normalizedWord.length - 1, 1);
          const comboBonus = getComboBonus(currentCombo, normalizedWord.length);
          const scoreWithoutMultiplier = wordLenScore + comboBonus;
          const multiplier = getScoreMultiplier();
          // fireRoundBonus is the extra points from doubling (when multiplier is 2x)
          const fireRoundBonus = multiplier > 1 ? scoreWithoutMultiplier : 0;

          // Update ref immediately to avoid race condition when game ends right after validation
          foundWordsRef.current = foundWordsRef.current.map(fw =>
            fw.word === normalizedWord && fw.timestamp === now
              ? { ...fw, isValid: true, score: fullScore, comboBonus, fireRoundBonus }
              : fw
          );
          setFoundWords(foundWordsRef.current);

          // Add full score with combo (exactly like multiplayer)
          setScore(prev => prev + fullScore);
          playWordAcceptedSound();

          // Combo increases for validated words (handled by hook)
          combo.incrementCombo(true);

          if (combo.validWordCount > 1) {
            playComboSound(currentCombo + 1);
          }

          // Show accepted feedback in WordFormingArea
          setCurrentFeedback({
            id: `accept-${now}`,
            type: 'accepted',
            word: normalizedWord.toUpperCase(),
            score: fullScore,
            fireRoundActive,
            fireRoundBonus,
            timestamp: now,
          });
          // Announce for screen readers
          announceWordResult(normalizedWord, true, fullScore);
          announceCombo(currentCombo + 1);
        } else {
          // Word NOT in dictionary - stays pending for AI validation at game end
          // BREAK combo (exactly like multiplayer's handlePendingWord)
          // Word keeps base score only (no combo bonus since combo is broken)
          combo.resetCombo();

          // Show pending notification in dedicated area
          setCurrentFeedback({
            id: `pending-${now}`,
            type: 'pending',
            word: normalizedWord.toUpperCase(),
            timestamp: now,
          });
        }
      })
      .catch(() => {
        // On API error, treat as pending - also breaks combo
        combo.resetCombo();
        setCurrentFeedback({
          id: `pending-${Date.now()}`,
          type: 'pending',
          word: normalizedWord.toUpperCase(),
          timestamp: Date.now(),
        });
      });
  }, [settings.language, settings.minWordLength, foundWords, t, playWordAcceptedSound, playComboSound, announceWordResult, announceCombo, combo, getComboBonus, getScoreMultiplier, fireRoundActive, calculateWordScore]);

  const handleFinishPractice = useCallback(() => {
    setIsGameOver(true);
  }, []);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Calculate revealable word count
  const revealableWordCount = React.useMemo(() => {
    if (!availableWords || !grid) return 0;
    const foundWordsList = foundWords.filter(fw => fw.isValid === true).map(fw => fw.word);
    return getRevealableWordCount(availableWords, foundWordsList, settings.language);
  }, [availableWords, foundWords, grid, settings.language]);

  // Handle reveal word - find a random 5+ letter word and highlight its path
  // NOTE: This only shows the word on the board - player must trace it themselves to get points
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

    // Only highlight the path on the grid - don't add the word to found words
    // Player must trace the word themselves to get the points
    setRevealState(prev => ({
      ...prev,
      revealsUsed: prev.revealsUsed + 1,
      isLoading: false,
      highlightedPath: path.map(p => ({ row: p.row, col: p.col })),
    }));

    // Clear highlight after 4 seconds (longer to give player time to trace it)
    setTimeout(() => {
      setRevealState(prev => ({ ...prev, highlightedPath: [] }));
    }, 4000);

    return result;
  }, [revealState.isLoading, availableWords, grid, foundWords, settings.language]);

  if (!grid) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-3">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {t('common.loading') || 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Landscape mode layout - maximized grid with minimal chrome
  if (isLandscape) {
    const validWordCount = foundWords.filter(fw => fw.isValid === true).length;
    // Count only 5+ letter words for WordsProgress (matches totalBoardWords filter)
    const longWordCount = foundWords.filter(fw => fw.isValid === true && fw.word.length >= MIN_TRACKED_WORD_LENGTH).length;

    return (
      <div className="relative flex items-center justify-center w-full h-full min-h-screen overflow-hidden bg-slate-900 text-white">
        {/* Earthquake Warning Overlay */}
        <EarthquakeWarning
          isVisible={earthquakeState === 'warning'}
        />

        {/* Fire Round Indicator */}
        <FireRoundIndicator
          isActive={fireRoundActive}
          remainingSeconds={fireRoundRemaining}
        />

        {/* Word Validation Loading Overlay */}
        <AdaptiveAnimatePresence>
          {isValidatingWords && (
            <AdaptiveMotion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-4 p-6 bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-neo-cyan/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-neo-cyan rounded-full animate-spin" />
                </div>
                <p className="text-neo-black font-bold text-lg">
                  {t('singlePlayer.verifyingWords') || 'Verifying words...'}
                </p>
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        {/* Achievement Progress Tracker - shows near-completion achievements, auto-dismisses 2s after game ends */}
        <AchievementProgressTracker
          validWordCount={validWordCount}
          comboLevel={combo.comboLevel}
          maxCombo={combo.maxCombo}
          wordLengths={foundWords.filter(fw => fw.isValid === true).map(fw => fw.word.length)}
          timeSinceStart={settings.timerSeconds - timer.remainingTime}
          gameDuration={settings.timerSeconds}
          earnedAchievements={[]}
          isGameOver={isGameOver}
        />

        {/* Left side: Timer + Score + Reveal */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
          {settings.mode !== 'practice' && (
            <CircularTimer
              remainingTime={timer.remainingTime}
              totalTime={settings.timerSeconds}
              size="sm"
            />
          )}
          <div className="bg-neo-yellow border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-center">
            <AdaptiveMotion.div
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-black text-neo-black"
            >
              {score}
            </AdaptiveMotion.div>
            <div className="text-xs font-bold uppercase text-neo-black/70">
              {t('common.score') || 'Score'}
            </div>
          </div>
          {/* Reveal Button - below score, away from central gameplay area */}
          <RevealButton
            revealsUsed={revealState.revealsUsed}
            revealableWordsCount={revealableWordCount}
            isLoading={revealState.isLoading}
            gameActive={!isPaused && !isGameOver && timer.remainingTime > 0}
            onReveal={handleReveal}
            t={t}
          />
        </div>

        {/* Right side: Words count + Words Remaining + Combo */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
          <div className="bg-neo-cream border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-center">
            <div className="text-sm font-black text-neo-black">{validWordCount}</div>
            <div className="text-xs font-bold uppercase text-neo-black/70">
              {t('common.words') || 'Words'}
            </div>
          </div>
          {totalBoardWords !== null && totalBoardWords > 0 && (
            <WordsProgress
              totalWords={totalBoardWords}
              foundWordsCount={longWordCount}
              t={t}
              minLength={MIN_TRACKED_WORD_LENGTH}
              compact
            />
          )}
          <ComboDisplay comboLevel={combo.comboLevel} compact />
        </div>

        {/* Top-right: Help button (moved to avoid covering game board) */}
        <div className="absolute top-2 right-2 z-30">
          <HelpButton
            onClick={() => setIsHelpOpen(true)}
            className="min-w-[44px] min-h-[44px] w-11 h-11 opacity-70 hover:opacity-100"
            aria-label={t('common.help') || 'Help'}
          />
        </div>

        {/* Bottom-left: Pause/Finish button (primary action - easy thumb reach) */}
        <div className="absolute bottom-2 left-2 z-30">
          {settings.mode !== 'practice' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? (t('common.resume') || 'Resume') : (t('common.pause') || 'Pause')}
              aria-pressed={isPaused}
              className="w-12 h-12 p-0 bg-neo-cream hover:brightness-110 border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
            >
              {isPaused ? <Play className="text-lg text-neo-black" /> : <Pause className="text-lg text-neo-black" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFinishPractice}
              aria-label={t('singlePlayer.finish') || 'Finish'}
              className="px-4 h-12 min-h-[48px] bg-neo-lime hover:brightness-110 border-2 border-neo-black rounded-neo text-sm font-bold text-neo-black shadow-hard-sm"
            >
              {t('singlePlayer.finish') || 'Finish'}
            </Button>
          )}
        </div>

        {/* Bottom-right: Quit button (secondary - requires confirmation if score > 0) */}
        <div className="absolute bottom-2 right-2 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuitRequest}
            aria-label={t('common.quit') || 'Quit game'}
            className="w-12 h-12 p-0 bg-neo-red hover:brightness-110 border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
          >
            <ArrowLeft className="text-lg text-neo-cream rtl:rotate-180" />
          </Button>
        </div>

        {/* Center: Word Forming Area + Grid - maximized for landscape */}
        <div className="flex flex-col items-center justify-center w-full h-full px-3 py-0.5 landscape-grid-container">
          {/* Word Forming Area - Permanent space above grid (keep timer section clear) */}
          <div className="flex items-center mb-0.5">
            <WordFormingArea
              word={formedWord}
              letterCount={letterCount}
              feedback={currentFeedback}
              compact
            />
          </div>
          <div className="flex-1 flex items-center justify-center game-board-frame-landscape" style={{ aspectRatio: '1/1' }}>
            <GridComponent
              grid={grid}
              interactive={!isPaused}
              onWordSubmit={handleWordSubmit}
              onPathSubmit={directionGuidance.trackWordPath}
              onWordChange={handleWordChange}
              hideWordPreview
              hideComboIndicator={true}
              comboLevel={combo.comboLevel}
              largeText
              fireRoundActive={fireRoundActive}
              earthquakeShaking={earthquakeState === 'shaking'}
              highlightedPath={revealState.highlightedPath}
            />
          </div>
        </div>

        {/* Help Panel */}
        <HelpPanel
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />

        {/* Direction Guidance Tooltip - shows when player only uses straight-line directions */}
        <DirectionGuidanceTooltip
          isVisible={directionGuidance.showDirectionGuidance}
          onDismiss={directionGuidance.dismissDirectionGuidance}
          t={t}
        />

        {/* Quit Confirmation Dialog */}
        <ConfirmationDialog
          open={showQuitConfirm}
          onOpenChange={setShowQuitConfirm}
          title={t('singlePlayer.quitConfirmTitle') || 'Quit Game?'}
          description={t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?'}
          confirmText={t('common.quit') || 'Quit'}
          cancelText={t('common.cancel') || 'Cancel'}
          onConfirm={onQuit}
          variant="danger"
        />

        {/* First-time Landscape Tutorial Overlay */}
        <AdaptiveAnimatePresence>
          {showLandscapeTutorial && (
            <AdaptiveMotion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center"
              onClick={dismissLandscapeTutorial}
            >
              <AdaptiveMotion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard p-6 max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-black text-neo-black mb-4">
                  {t('landscape.tutorialTitle') || 'Landscape Controls'}
                </h2>
                <div className="space-y-3 text-neo-black/80 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neo-cream text-neo-black border-2 border-neo-black rounded-neo flex items-center justify-center">
                      <Pause className="text-neo-black" />
                    </div>
                    <span>{t('landscape.tutorialPause') || 'Bottom-left: Pause/Resume game'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neo-red border-2 border-neo-black rounded-neo flex items-center justify-center">
                      <ArrowLeft className="text-neo-cream rtl:rotate-180" />
                    </div>
                    <span>{t('landscape.tutorialQuit') || 'Bottom-right: Quit game'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo flex items-center justify-center">
                      <HelpCircle className="text-neo-black" />
                    </div>
                    <span>{t('landscape.tutorialHelp') || 'Top-right: Help & rules'}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-neo-black/20 text-sm text-neo-black/75">
                  <p>{t('landscape.tutorialKeyboard') || 'Keyboard: Space = Pause, Esc = Quit, ? = Help'}</p>
                </div>
                <Button
                  onClick={dismissLandscapeTutorial}
                  className="w-full mt-4 bg-neo-cyan border-2 border-neo-black rounded-neo font-bold text-neo-black hover:brightness-110 h-12"
                >
                  {t('common.gotIt') || 'Got it!'}
                </Button>
              </AdaptiveMotion.div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        {/* Screen reader status announcements */}
        <div className="sr-only" role="status" aria-live="polite">
          {isPaused && (t('singlePlayer.gamePaused') || 'Game paused')}
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      {/* Earthquake Warning Overlay */}
      <EarthquakeWarning
        isVisible={earthquakeState === 'warning'}
      />

      {/* Fire Round Indicator */}
      <FireRoundIndicator
        isActive={fireRoundActive}
        remainingSeconds={fireRoundRemaining}
      />

      {/* Word Validation Loading Overlay */}
      <AdaptiveAnimatePresence>
        {isValidatingWords && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 p-6 bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-neo-cyan/30 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-neo-cyan rounded-full animate-spin" />
              </div>
              <p className="text-neo-black font-bold text-lg">
                {t('singlePlayer.verifyingWords') || 'Verifying words...'}
              </p>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* Achievement Progress Tracker - shows near-completion achievements, auto-dismisses 2s after game ends */}
      <AchievementProgressTracker
        validWordCount={foundWords.filter(fw => fw.isValid === true).length}
        comboLevel={combo.comboLevel}
        maxCombo={combo.maxCombo}
        wordLengths={foundWords.filter(fw => fw.isValid === true).map(fw => fw.word.length)}
        timeSinceStart={settings.timerSeconds - timer.remainingTime}
        gameDuration={settings.timerSeconds}
        earnedAchievements={[]}
        isGameOver={isGameOver}
      />

      {/* Header with controls */}
      <div className="flex items-center justify-between px-4">
        <Button variant="ghost" size="sm" onClick={handleQuitRequest}>
          <ArrowLeft className="me-2 rtl:rotate-180" />
          {t('common.quit') || 'Quit'}
        </Button>
        {settings.mode !== 'practice' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play /> : <Pause />}
          </Button>
        ) : (
          <Button variant="accent" onClick={handleFinishPractice}>
            {t('singlePlayer.finish') || 'Finish'}
          </Button>
        )}
      </div>

      {/* Stats row - Combo | Timer | Score - matches multiplayer layout */}
      <div ref={gameStatsRef} className="flex items-center justify-center gap-3 md:gap-4 mb-2" role="status" aria-label="Game status">
        {/* Combo (left - shows when level >= 2, placeholder otherwise for layout balance) */}
        <div className="min-w-[70px] md:min-w-[90px] flex justify-end">
          <ComboDisplay comboLevel={combo.comboLevel} compact />
        </div>

        {/* Timer (center - always visible and prominent) */}
        {settings.mode !== 'practice' && (
          <AdaptiveMotion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-20"
          >
            <CircularTimer
              remainingTime={timer.remainingTime}
              totalTime={settings.timerSeconds}
              size="md"
            />
          </AdaptiveMotion.div>
        )}

        {/* Score (right position) - vibrant yellow/lime gradient like multiplayer */}
        <AdaptiveMotion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-3 md:px-4 py-1.5 min-w-[70px] md:min-w-[90px]"
          style={{
            background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
          }}
        >
          <div className="text-center">
            <AdaptiveMotion.div
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-xl md:text-2xl font-black text-neo-black leading-tight"
              style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
            >
              {score}
            </AdaptiveMotion.div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-neo-black/80">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </AdaptiveMotion.div>
      </div>

      {/* Word Forming Area with feedback - centered below timer (keep timer section clean) */}
      <div className="flex items-center justify-center mb-1">
        <WordFormingArea
          word={formedWord}
          letterCount={letterCount}
          feedback={currentFeedback}
          compact
        />
      </div>

      {/* Challenge Mode Progress Tracker */}
      {settings.mode === 'challenge' && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-1"
        >
          {targetHighScore !== null ? (
            <div className={cn(
              'relative rounded-neo border-3 px-4 py-2 shadow-hard-sm',
              score > targetHighScore
                ? 'bg-gradient-to-r from-neo-lime to-lime-300 border-neo-lime'
                : score === targetHighScore
                  ? 'bg-gradient-to-r from-neo-yellow to-yellow-300 border-neo-yellow'
                  : 'bg-neo-cream dark:bg-slate-700 border-neo-black dark:border-slate-500'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {score > targetHighScore ? (
                    <>
                      <TrendingUp className="w-5 h-5 text-neo-black" />
                      <span className="font-black text-sm text-neo-black uppercase">
                        {t('challenge.newRecord') || 'New Record!'}
                      </span>
                    </>
                  ) : score === targetHighScore ? (
                    <>
                      <Target className="w-5 h-5 text-neo-black" />
                      <span className="font-black text-sm text-neo-black uppercase">
                        {t('challenge.tied') || 'Tied!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-neo-yellow" />
                      <span className="font-bold text-sm text-neo-black/70 dark:text-neo-white/70">
                        {t('challenge.recordToBeat') || 'Record'}: <span className="font-black text-neo-black dark:text-neo-white">{targetHighScore}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {score > targetHighScore ? (
                    <AdaptiveMotion.span
                      key={score}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="font-black text-neo-black"
                    >
                      +{score - targetHighScore}
                    </AdaptiveMotion.span>
                  ) : score < targetHighScore ? (
                    <span className="font-bold text-neo-black/75 dark:text-neo-white/75">
                      {targetHighScore - score} {t('challenge.toGo')}
                    </span>
                  ) : null}
                </div>
              </div>
              {/* Progress bar */}
              {score <= targetHighScore && (
                <div className="mt-2 h-2 bg-neo-black/10 text-white dark:bg-white/10 rounded-full overflow-hidden">
                  <AdaptiveMotion.div
                    className="h-full bg-gradient-to-r from-neo-cyan to-neo-lime rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((score / targetHighScore) * 100, 100)}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-neo-cyan/20 text-neo-black dark:bg-neo-cyan/10 dark:text-white rounded-neo border-2 border-dashed border-neo-cyan">
              <Zap className="w-4 h-4 text-neo-cyan" />
              <span className="font-bold text-sm text-neo-black/70 dark:text-neo-white/70">
                {t('challenge.settingFirst') || 'Setting your first record!'}
              </span>
            </div>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Game grid */}
      <div className="flex justify-center">
        <GridComponent
          grid={grid}
          interactive={!isPaused}
          onWordSubmit={handleWordSubmit}
          onPathSubmit={directionGuidance.trackWordPath}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator={true}
          comboLevel={combo.comboLevel}
          largeText
          fireRoundActive={fireRoundActive}
          earthquakeShaking={earthquakeState === 'shaking'}
          highlightedPath={revealState.highlightedPath}
        />
      </div>

      {/* Theme Indicator + Words Progress - same row below grid */}
      {(boardTheme || (totalBoardWords !== null && totalBoardWords > 0)) && (
        <div className="flex items-center justify-center gap-3 mt-1">
          {boardTheme && (
            <div className="opacity-70">
              <ThemeIndicator theme={boardTheme} />
            </div>
          )}
          {totalBoardWords !== null && totalBoardWords > 0 && (
            <WordsProgress
              totalWords={totalBoardWords}
              foundWordsCount={foundWords.filter(fw => fw.isValid === true && fw.word.length >= MIN_TRACKED_WORD_LENGTH).length}
              t={t}
              minLength={MIN_TRACKED_WORD_LENGTH}
            />
          )}
        </div>
      )}



      {/* Bot scores (only in solo-bots mode) */}
      {settings.mode === 'solo-bots' && settings.bots.length > 0 && (
        <div className="bg-neo-cream text-neo-black dark:bg-neo-navy-light dark:text-white rounded-neo border-3 border-neo-black p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 mb-2">
            {t('singlePlayer.opponents') || 'Opponents'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {settings.bots.map(bot => (
              <div
                key={bot.id}
                className={cn(
                  'p-2 rounded-neo border-2 border-neo-black text-center',
                  botScores[bot.id] > score ? 'bg-neo-red/20' : 'bg-neo-lime/20'
                )}
              >
                <div className="text-xs font-bold truncate">{bot.name}</div>
                <div className="text-lg font-black">{botScores[bot.id] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reveal Button - fixed at bottom left corner (away from timer section) */}
      <div className="fixed bottom-0 left-0 z-40 mb-[max(env(safe-area-inset-bottom),8px)] ml-2">
        <RevealButton
          revealsUsed={revealState.revealsUsed}
          revealableWordsCount={revealableWordCount}
          isLoading={revealState.isLoading}
          gameActive={!isPaused && !isGameOver && timer.remainingTime > 0}
          onReveal={handleReveal}
          t={t}
        />
      </div>

      {/* Help Button - fixed at bottom right corner, not covering the board */}
      <HelpButton
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-0 right-0 z-40 mb-[max(env(safe-area-inset-bottom),8px)] mr-2 min-w-[44px] min-h-[44px] w-11 h-11 opacity-70 hover:opacity-100"
      />

      {/* Help Panel - bottom sheet */}
      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Direction Guidance Tooltip - shows when player only uses straight-line directions */}
      <DirectionGuidanceTooltip
        isVisible={directionGuidance.showDirectionGuidance}
        onDismiss={directionGuidance.dismissDirectionGuidance}
        t={t}
      />

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle') || 'Quit Game?'}
        description={t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?'}
        confirmText={t('singlePlayer.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={onQuit}
        variant="danger"
      />
    </div>
  );
};

export default SinglePlayerGame;
