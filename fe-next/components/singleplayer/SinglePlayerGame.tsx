'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaPause, FaPlay, FaCrown } from 'react-icons/fa';
import { TrendingUp, Target, Zap } from 'lucide-react';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { EarthquakeWarning, FireRoundIndicator } from '@/components/earthquake';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import { generateRandomTable, applyHebrewFinalLetters } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { cn } from '@/lib/utils';
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';
import { wordErrorToast, wordAcceptedToast, wordNeedsValidationToast } from '@/components/NeoToast';
import { useAnnouncer } from '@/components/GameAnnouncer';
import {
  calculateFinalAchievements,
  type WordData as AchievementWordData,
} from '@/utils/singlePlayerAchievements';
import type { SinglePlayerGameState, SinglePlayerResultsData, BotOpponent } from './SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

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
  const { announceWordResult, announceCombo } = useAnnouncer();
  const { stopMusic } = useMusic();
  const isLandscape = useMobileLandscape();
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [remainingTime, setRemainingTime] = useState(settings.timerSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [comboLevel, setComboLevel] = useState(0);
  const [botScores, setBotScores] = useState<Record<string, number>>({});
  const [botWords, setBotWords] = useState<Record<string, string[]>>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const botIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  const gameOverCalledRef = useRef(false);
  const validWordCountRef = useRef(0); // Track valid words for combo
  const gameStartTimeRef = useRef<number>(Date.now()); // Track when game started for pace analysis
  const maxComboRef = useRef(0); // Track max combo achieved for final achievements

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
  const comboLevelRef = useRef(comboLevel);

  // Keep refs in sync
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
  useEffect(() => { botScoresRef.current = botScores; }, [botScores]);
  useEffect(() => { botWordsRef.current = botWords; }, [botWords]);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { comboLevelRef.current = comboLevel; }, [comboLevel]);

  // Use shared game music hook - handles in-game music, urgent music, and stop on game end
  // Consistent with multiplayer: urgent music at 20 seconds, stops when timer hits 0
  useGameMusic({
    phase: 'playing',
    remainingTime,
    isPaused: isPaused || isGameOver || settings.mode === 'practice',
    enabled: settings.mode !== 'practice', // No timed music in practice mode
  });

  // Stop music when component unmounts (e.g., when player quits)
  useEffect(() => {
    return () => {
      stopMusic(500); // Fade out quickly on unmount
    };
  }, [stopMusic]);

  // Earthquake/Fire Round feature
  const {
    earthquakeState,
    fireRoundActive,
    fireRoundRemaining,
    getScoreMultiplier,
  } = useEarthquakeFireRound({
    enabled: settings.mode !== 'practice',
    gameDurationSeconds: settings.timerSeconds,
    currentTimeSeconds: remainingTime,
    language: settings.language,
    difficulty: settings.difficulty,
    mode: 'singleplayer',
    onGridRegenerate: (newGrid) => {
      setGrid(newGrid);
      // Clear found words set when grid regenerates
      foundWordsSetRef.current.clear();
    },
    onEarthquakeStart: () => {
      // Play earthquake rumble sound and haptic feedback
      playEarthquakeRumble();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]); // Light vibration pattern
      }
    },
    onEarthquakeShake: () => {
      // Play earthquake shake sound and heavy haptic
      playEarthquakeShake();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]); // Heavy shake pattern
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
  });

  // Generate grid on mount
  useEffect(() => {
    const difficultyConfig = DIFFICULTIES[settings.difficulty];
    const newGrid = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      settings.language
    );
    setGrid(newGrid);

    // Initialize bot scores
    const initialBotScores: Record<string, number> = {};
    const initialBotWords: Record<string, string[]> = {};
    settings.bots.forEach(bot => {
      initialBotScores[bot.id] = 0;
      initialBotWords[bot.id] = [];
    });
    setBotScores(initialBotScores);
    setBotWords(initialBotWords);
  }, [settings.difficulty, settings.language, settings.bots]);

  // Handle game over when isGameOver becomes true
  useEffect(() => {
    if (!isGameOver || gameOverCalledRef.current || !gridRef.current) return;

    gameOverCalledRef.current = true;

    // Clean up timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    botIntervalsRef.current.forEach(clearInterval);

    // Validate pending words with AI before ending (same as multiplayer)
    // Uses batch API endpoint for efficiency - single request for all pending words
    const finalizeAndEndGame = async () => {
      const currentWords = foundWordsRef.current;
      const pendingWords = currentWords.filter(w => w.isValid === null);

      let finalWords = currentWords;

      // Batch validate pending words with AI (single API call like multiplayer)
      if (pendingWords.length > 0) {
        try {
          const response = await fetch('/api/validate-words-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              words: pendingWords.map(pw => pw.word),
              language: settings.language,
              minWordLength: 2, // Default minimum word length for single player
            }),
          });
          const result = await response.json();

          if (result.success && Array.isArray(result.results)) {
            // Create a map for quick lookup
            const validationMap = new Map<string, boolean>();
            for (const r of result.results) {
              validationMap.set(r.word, r.isValid);
            }

            // Update words with AI validation results
            finalWords = currentWords.map(w => {
              if (w.isValid === null) {
                const isValid = validationMap.get(w.word) ?? false;
                return { ...w, isValid };
              }
              return w;
            });
          } else {
            // On error, mark pending words as invalid
            finalWords = currentWords.map(w =>
              w.isValid === null ? { ...w, isValid: false } : w
            );
          }
        } catch {
          // On error, mark pending words as invalid
          finalWords = currentWords.map(w =>
            w.isValid === null ? { ...w, isValid: false } : w
          );
        }
      }

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
        maxComboRef.current
      );

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
      };

      onGameEnd(results);
    };

    finalizeAndEndGame();
  }, [isGameOver, settings.bots, settings.language, onGameEnd]);

  // Timer effect
  useEffect(() => {
    if (settings.mode === 'practice') return;
    if (isPaused || remainingTime <= 0 || isGameOver) return;

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Trigger game over via state change, not direct call
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, settings.mode, isGameOver]);

  // Bot simulation effect
  useEffect(() => {
    if (settings.mode !== 'solo-bots' || isPaused || settings.bots.length === 0 || isGameOver) return;

    settings.bots.forEach(bot => {
      const interval = getBotInterval(bot.difficulty);
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
  }, [settings.mode, settings.bots, isPaused, isGameOver]);

  const getBotInterval = (difficulty: 'easy' | 'medium' | 'hard'): number => {
    const intervals = {
      easy: 6000 + Math.random() * 4000,
      medium: 3500 + Math.random() * 3000,
      hard: 2000 + Math.random() * 2000,
    };
    return intervals[difficulty];
  };

  const simulateBotFindWord = useCallback((bot: BotOpponent) => {
    const wordLengths = {
      easy: [3, 4, 5],
      medium: [4, 5, 6],
      hard: [5, 6, 7, 8],
    };
    const lengths = wordLengths[bot.difficulty];
    const length = lengths[Math.floor(Math.random() * lengths.length)];
    // Bots don't have combos, so pass 0
    const wordScore = calculateWordScore(length, 0);

    setBotScores(prev => ({
      ...prev,
      [bot.id]: (prev[bot.id] || 0) + wordScore,
    }));

    setBotWords(prev => ({
      ...prev,
      [bot.id]: [...(prev[bot.id] || []), `word${length}`],
    }));
  }, []);

  const calculateWordScore = (wordLength: number, currentComboLevel: number): number => {
    // Base score: word length - 1 (matches multiplayer scoring)
    const baseScore = Math.max(wordLength - 1, 1);
    // Combo bonus scales with combo level (only applies after first word)
    const comboBonus = currentComboLevel > 0 ? Math.floor(baseScore * (currentComboLevel * 0.1)) : 0;
    // Fire round multiplier (2x during fire round, 1x otherwise)
    const multiplier = getScoreMultiplier();
    return (baseScore + comboBonus) * multiplier;
  };


  const handleWordSubmit = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();
    const minWordLength = 2;
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
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      validWordCountRef.current = 0;
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
      wordErrorToast(msg, { duration: 1000 });
      announceWordResult(normalizedWord, false, undefined, msg);
      // Reset combo on invalid word submission (consistent with multiplayer behavior)
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      validWordCountRef.current = 0;
      return;
    }

    // Step 2: Check if word exists as a valid path on the board - same as multiplayer
    if (!isWordOnBoard(normalizedWord, grid, settings.language)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard') || 'Word not on board';
      wordErrorToast(notOnBoardMsg, { duration: 1500 });
      announceWordResult(normalizedWord, false, undefined, notOnBoardMsg);
      // Reset combo on invalid word submission (consistent with multiplayer behavior)
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      validWordCountRef.current = 0;
      return;
    }

    // Step 3: Check for duplicates - same as multiplayer
    // MUST reset combo when duplicate is submitted (consistent with multiplayer behavior)
    if (foundWordsSetRef.current.has(normalizedWord)) {
      const alreadyFoundMsg = t('playerView.wordAlreadyFound') || 'Already found!';
      wordErrorToast(alreadyFoundMsg, { duration: 1000 });
      announceWordResult(normalizedWord, false, undefined, alreadyFoundMsg);
      // Reset combo on duplicate submission
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      setComboLevel(0);
      validWordCountRef.current = 0;
      return;
    }

    // Add to set immediately to prevent double submission
    foundWordsSetRef.current.add(normalizedWord);

    const currentCombo = comboLevelRef.current;
    const baseScore = calculateWordScore(normalizedWord.length, 0); // Base score without combo
    const fullScore = calculateWordScore(normalizedWord.length, currentCombo); // Score with combo
    const timeSinceStart = (now - gameStartTimeRef.current) / 1000;

    // Step 4: Add word with pending state and BASE score (no combo yet)
    // Score will be updated if validated (like multiplayer's async socket)
    setFoundWords(prev => [...prev, {
      word: normalizedWord,
      score: baseScore, // Start with base score, updated if validated with combo
      timestamp: now,
      timeSinceStart,
      isValid: null, // Pending - will update after dictionary check
    }]);

    // Step 5: Check dictionary via API (same validation as multiplayer backend)
    // Combo and score only added AFTER validation (like multiplayer)
    fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalizedWord, language: settings.language }),
    })
      .then(res => res.json())
      .then(result => {
        if (result.isValid) {
          // Word is in dictionary/community - valid immediately (like multiplayer's handleValidatedWord)
          // Update with FULL score (including combo bonus)
          const comboBonus = fullScore - baseScore;
          setFoundWords(prev => prev.map(fw =>
            fw.word === normalizedWord && fw.timestamp === now
              ? { ...fw, isValid: true, score: fullScore, comboBonus }
              : fw
          ));

          // Add full score with combo (exactly like multiplayer)
          setScore(prev => prev + fullScore);
          playWordAcceptedSound();

          // Combo increases for validated words
          validWordCountRef.current += 1;
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          setComboLevel(prev => {
            const newCombo = prev + 1;
            // Track max combo for achievements
            if (newCombo > maxComboRef.current) {
              maxComboRef.current = newCombo;
            }
            return newCombo;
          });
          comboTimeoutRef.current = setTimeout(() => setComboLevel(0), 8000);

          if (validWordCountRef.current > 1) {
            playComboSound(currentCombo + 1);
          }

          // Show accepted toast with full score (like multiplayer's wordAccepted event)
          wordAcceptedToast(normalizedWord.toUpperCase(), {
            score: fullScore,
            comboLevel: currentCombo > 0 ? currentCombo : undefined,
          });
          // Announce for screen readers
          announceWordResult(normalizedWord, true, fullScore);
          announceCombo(currentCombo + 1);
        } else {
          // Word NOT in dictionary - stays pending for AI validation at game end
          // BREAK combo (exactly like multiplayer's handlePendingWord)
          // Word keeps base score only (no combo bonus since combo is broken)
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          setComboLevel(0);
          validWordCountRef.current = 0;

          // Show pending toast (like multiplayer's wordNeedsValidation event)
          wordNeedsValidationToast(normalizedWord.toUpperCase());
        }
      })
      .catch(() => {
        // On API error, treat as pending - also breaks combo
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        setComboLevel(0);
        validWordCountRef.current = 0;
        wordNeedsValidationToast(normalizedWord.toUpperCase());
      });
  }, [settings.language, grid, foundWords, t, playWordAcceptedSound, playComboSound, announceWordResult, announceCombo]);

  const handleFinishPractice = useCallback(() => {
    setIsGameOver(true);
  }, []);

  if (!grid) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-3">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('common.loading') || 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Landscape mode layout - maximized grid with minimal chrome
  if (isLandscape) {
    const validWordCount = foundWords.filter(fw => fw.isValid === true).length;

    return (
      <div className="relative flex items-center justify-center w-full h-full min-h-screen overflow-hidden bg-slate-900">
        {/* Earthquake Warning Overlay */}
        <EarthquakeWarning
          isVisible={earthquakeState === 'warning'}
        />

        {/* Fire Round Indicator */}
        <FireRoundIndicator
          isActive={fireRoundActive}
          remainingSeconds={fireRoundRemaining}
        />
        {/* Left side: Timer + Score */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
          {settings.mode !== 'practice' && (
            <CircularTimer
              remainingTime={remainingTime}
              totalTime={settings.timerSeconds}
              size="sm"
            />
          )}
          <div className="bg-neo-yellow border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-center">
            <motion.div
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-black text-neo-black"
            >
              {score}
            </motion.div>
            <div className="text-[7px] font-bold uppercase text-neo-black/70">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </div>

        {/* Right side: Words count + Combo */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
          <div className="bg-neo-cream/90 border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-center">
            <div className="text-sm font-black text-neo-black">{validWordCount}</div>
            <div className="text-[7px] font-bold uppercase text-neo-black/70">
              {t('common.words') || 'Words'}
            </div>
          </div>
          <AnimatePresence>
            {comboLevel > 1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="bg-neo-cyan border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-center"
              >
                <motion.div
                  key={comboLevel}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-sm font-black text-neo-black"
                >
                  x{comboLevel}
                </motion.div>
                <div className="text-[7px] font-bold uppercase text-neo-black/70">
                  {t('common.combo') || 'Combo'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Top-left: Quit button */}
        <div className="absolute top-2 left-2 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onQuit}
            className="w-8 h-8 p-0 bg-neo-red/90 hover:bg-neo-red border-2 border-neo-black rounded-neo"
          >
            <FaArrowLeft className="text-xs text-neo-black" />
          </Button>
        </div>

        {/* Top-right: Pause/Help buttons */}
        <div className="absolute top-2 right-2 z-30 flex gap-1">
          {settings.mode !== 'practice' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="w-8 h-8 p-0 bg-neo-cream/90 hover:bg-neo-cream border-2 border-neo-black rounded-neo"
            >
              {isPaused ? <FaPlay className="text-xs text-neo-black" /> : <FaPause className="text-xs text-neo-black" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFinishPractice}
              className="px-2 h-8 bg-neo-lime/90 hover:bg-neo-lime border-2 border-neo-black rounded-neo text-xs font-bold text-neo-black"
            >
              {t('singlePlayer.finish') || 'Finish'}
            </Button>
          )}
          <HelpButton
            onClick={() => setIsHelpOpen(true)}
            className="w-8 h-8"
          />
        </div>

        {/* Center: Grid - maximized for landscape */}
        <div className="flex items-center justify-center w-full h-full px-3 py-0.5 landscape-grid-container">
          <div className="h-full flex items-center justify-center game-board-frame-landscape" style={{ aspectRatio: '1/1' }}>
            <GridComponent
              grid={grid}
              interactive={!isPaused}
              onWordSubmit={handleWordSubmit}
              comboLevel={comboLevel}
              largeText
              fireRoundActive={fireRoundActive}
              earthquakeShaking={earthquakeState === 'shaking'}
            />
          </div>
        </div>

        {/* Help Panel */}
        <HelpPanel
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Earthquake Warning Overlay */}
      <EarthquakeWarning
        isVisible={earthquakeState === 'warning'}
      />

      {/* Fire Round Indicator */}
      <FireRoundIndicator
        isActive={fireRoundActive}
        remainingSeconds={fireRoundRemaining}
      />

      {/* Header with controls */}
      <div className="flex items-center justify-between px-4">
        <Button variant="ghost" size="sm" onClick={onQuit}>
          <FaArrowLeft className="mr-2" />
          {t('common.quit') || 'Quit'}
        </Button>
        {settings.mode !== 'practice' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <FaPlay /> : <FaPause />}
          </Button>
        ) : (
          <Button variant="accent" onClick={handleFinishPractice}>
            {t('singlePlayer.finish') || 'Finish'}
          </Button>
        )}
      </div>

      {/* Timer with Score and Combo flanking it */}
      <div className="flex items-center justify-center gap-4">
        {/* Score - Neo-Brutalist card */}
        <motion.div
          initial={{ scale: 0, rotate: -5 }}
          animate={{ scale: 1, rotate: -2 }}
          className="relative bg-neo-yellow border-4 border-neo-black rounded-neo-lg shadow-hard px-4 py-2 min-w-[80px]"
        >
          <div
            className="text-center"
            style={{ transform: 'rotate(2deg)' }}
          >
            <motion.div
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-2xl font-black text-neo-black"
              style={{ textShadow: '2px 2px 0px var(--neo-cream)' }}
            >
              {score}
            </motion.div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-neo-black/70">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </motion.div>

        {/* Timer */}
        {settings.mode !== 'practice' && (
          <CircularTimer
            remainingTime={remainingTime}
            totalTime={settings.timerSeconds}
          />
        )}

        {/* Combo - Neo-Brutalist card (only shows when combo > 1) */}
        <div className="min-w-[80px]">
          <AnimatePresence>
            {comboLevel > 1 && (
              <motion.div
                initial={{ scale: 0, rotate: 5, opacity: 0 }}
                animate={{ scale: 1, rotate: 2, opacity: 1 }}
                exit={{ scale: 0, rotate: 10, opacity: 0 }}
                className="relative bg-neo-cyan border-4 border-neo-black rounded-neo-lg shadow-hard px-4 py-2"
              >
                <div
                  className="text-center"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  <motion.div
                    key={comboLevel}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-black text-neo-black"
                    style={{ textShadow: '2px 2px 0px var(--neo-cream)' }}
                  >
                    x{comboLevel}
                  </motion.div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neo-black/70">
                    {t('common.combo') || 'Combo'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Challenge Mode Progress Tracker */}
      {settings.mode === 'challenge' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4"
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
                      <FaCrown className="w-4 h-4 text-neo-yellow" />
                      <span className="font-bold text-sm text-neo-black/70 dark:text-neo-white/70">
                        {t('challenge.recordToBeat') || 'Record'}: <span className="font-black text-neo-black dark:text-neo-white">{targetHighScore}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {score > targetHighScore ? (
                    <motion.span
                      key={score}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="font-black text-neo-black"
                    >
                      +{score - targetHighScore}
                    </motion.span>
                  ) : score < targetHighScore ? (
                    <span className="font-bold text-neo-black/60 dark:text-neo-white/60">
                      {targetHighScore - score} {t('challenge.toGo') || 'to go'}
                    </span>
                  ) : null}
                </div>
              </div>
              {/* Progress bar */}
              {score <= targetHighScore && (
                <div className="mt-2 h-2 bg-neo-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neo-cyan to-neo-lime rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((score / targetHighScore) * 100, 100)}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-neo-cyan/20 dark:bg-neo-cyan/10 rounded-neo border-2 border-dashed border-neo-cyan">
              <Zap className="w-4 h-4 text-neo-cyan" />
              <span className="font-bold text-sm text-neo-black/70 dark:text-neo-white/70">
                {t('challenge.settingFirst') || 'Setting your first record!'}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Game grid */}
      <div className="flex justify-center">
        <GridComponent
          grid={grid}
          interactive={!isPaused}
          onWordSubmit={handleWordSubmit}
          comboLevel={comboLevel}
          largeText
          fireRoundActive={fireRoundActive}
          earthquakeShaking={earthquakeState === 'shaking'}
        />
      </div>

      {/* Found words - Enhanced display with validity status */}
      <div className="bg-neo-cream dark:bg-neo-navy-light rounded-neo-lg border-4 border-neo-black p-4 shadow-hard">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 mb-3 flex items-center justify-between">
          <span>{t('common.foundWords') || 'Found Words'}</span>
          <span className="bg-neo-cyan text-neo-black px-2 py-0.5 rounded-full text-xs">
            {foundWords.filter(fw => fw.isValid === true).length}
          </span>
        </h3>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
          <AnimatePresence>
            {foundWords.filter(fw => fw.isValid !== false).map((fw, index) => {
              const isPending = fw.isValid === null;
              const isLatest = index === foundWords.filter(f => f.isValid !== false).length - 1;

              return (
                <motion.span
                  key={`${fw.word}-${fw.timestamp}`}
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className={cn(
                    'px-3 py-1.5 rounded-neo border-2 text-sm font-bold shadow-hard-sm transition-all',
                    isPending
                      ? 'bg-gray-200 text-gray-500 border-gray-400 animate-pulse'
                      : isLatest
                        ? 'bg-neo-yellow text-neo-black border-neo-black'
                        : fw.word.length >= 6
                          ? 'bg-neo-yellow text-neo-black border-neo-black'
                          : fw.word.length >= 5
                            ? 'bg-neo-lime text-neo-black border-neo-black'
                            : fw.word.length >= 4
                              ? 'bg-neo-cyan/70 text-neo-black border-neo-black'
                              : 'bg-white text-neo-black border-neo-black'
                  )}
                >
                  {applyHebrewFinalLetters(fw.word).toUpperCase()}
                  {!isPending && fw.score > 0 && (
                    <span className="ml-1 text-xs opacity-70">+{fw.score}</span>
                  )}
                  {isPending && (
                    <span className="ml-1 text-xs">...</span>
                  )}
                </motion.span>
              );
            })}
          </AnimatePresence>
          {foundWords.filter(fw => fw.isValid !== false).length === 0 && (
            <span className="text-sm text-neo-black/40 dark:text-neo-white/40 italic">
              {t('singlePlayer.noWordsYet') || 'No words found yet. Start swiping!'}
            </span>
          )}
        </div>
      </div>

      {/* Bot scores (only in solo-bots mode) */}
      {settings.mode === 'solo-bots' && settings.bots.length > 0 && (
        <div className="bg-neo-cream dark:bg-neo-navy-light rounded-neo border-3 border-neo-black p-4">
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

      {/* Help Button - fixed position */}
      <HelpButton
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-20 right-4 z-40"
      />

      {/* Help Panel - bottom sheet */}
      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};

export default SinglePlayerGame;
