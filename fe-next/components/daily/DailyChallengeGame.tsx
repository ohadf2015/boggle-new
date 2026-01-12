'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import WordFormingArea from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { AchievementProgressTracker } from '@/components/achievements/AchievementProgressTracker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useDirectionPatternGuidance } from '@/hooks/useDirectionPatternGuidance';
import { useFirstPlayTutorial } from '@/hooks/useFirstPlayTutorial';
import { useContextualGuidance, useSwipeTipGuidanceTrigger } from '@/hooks/useContextualGuidance';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import DirectionGuidanceTooltip from '@/components/game/DirectionGuidanceTooltip';
import SwipeTipTooltip from '@/components/game/SwipeTipTooltip';
import KeyboardHintTooltip from '@/components/game/KeyboardHintTooltip';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { finalizeWordValidation } from '@/utils/wordValidationAPI';
import { useCoinContext } from '@/contexts/CoinContext';
import type { LetterGrid, Language } from '@/types';

interface DailyChallengeGameProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  duration: number; // in seconds
  onComplete: (result: DailyChallengeGameResult) => void;
  onQuit: () => void;
}

interface DailyChallengeGameResult {
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>;
  timeSeconds: number;
  words: string[];
  longestWord: string;
}

/**
 * DailyChallengeGame - Core game component for daily challenge
 * Refactored to use shared hooks for combo, timer, and word submission
 */
const DailyChallengeGame: React.FC<DailyChallengeGameProps> = ({
  grid,
  puzzleNumber,
  language,
  duration,
  onComplete,
  onQuit,
}) => {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playComboSound, setGameActive } = useSoundEffects();
  const { stopMusic } = useMusic();
  const { awardComboMilestone } = useCoinContext();
  const isLandscape = useMobileLandscape();

  // Game state
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Available words from grid solver (for first-play tutorial)
  const [availableWords, setAvailableWords] = useState<{
    easy: string[];
    medium: string[];
    hard: string[];
  } | null>(null);

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);


  // Exit confirmation dialog state
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Guard against accidental browser back button / tab close during active game
  // Daily challenge is one-per-day so always guard (unlike single player which waits for score > 0)
  useNavigationGuard({
    enabled: !isGameOver,
    message: t('daily.quitConfirm') || 'If you quit, this will count as your attempt for today.',
    onNavigationAttempt: () => {
      setShowQuitConfirm(true);
      return false; // Block navigation, let modal handle it
    },
  });

  // Coin reward animation state
  const [comboCoinReward, setComboCoinReward] = useState<number | null>(null);

  // Refs for game end handler
  const gameOverCalledRef = useRef(false);
  const scoreRef = useRef(score);
  const handleGameEndRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Keep score ref in sync
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Enable sound effects when game is active, disable when leaving
  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, [setGameActive]);

  // Fetch valid words from grid for first-play tutorial
  useEffect(() => {
    if (!grid) return;

    const fetchGridWords = async () => {
      try {
        const response = await fetch('/api/solve-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grid, language }),
        });

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
  }, [grid, language]);

  // Stable callback for timer - prevents timer restart on every render
  const stableOnTimeUp = useCallback(() => {
    if (!gameOverCalledRef.current) {
      handleGameEndRef.current?.();
    }
  }, []);

  // === SHARED HOOKS ===

  // Combo system - handles combo state, refs, and timeouts
  const combo = useComboSystem({
    onComboSound: (level) => {
      if (level >= 3) {
        playComboSound?.(level);
      }
    },
    onComboMilestone: (level) => {
      // Award coins for combo milestones (5, 10, 15, 20, 25, 30)
      // Using unified CoinContext which handles auth/guest modes and DB sync
      void awardComboMilestone({ comboLevel: level, gameMode: 'daily' }).then((coinsAwarded) => {
        if (coinsAwarded > 0) {
          setComboCoinReward(coinsAwarded);
        }
      });
    },
    trackMaxCombo: true,
  });

  // Direction pattern guidance - shows when player only uses straight-line directions
  const directionGuidance = useDirectionPatternGuidance();

  // Contextual guidance - manages all guidance tooltips
  const contextualGuidance = useContextualGuidance();

  // Game timer - handles countdown with callbacks
  // Uses stableOnTimeUp to prevent timer restart on re-renders
  const timer = useGameTimer({
    initialTime: duration,
    isPaused: isGameOver,
    onTimeUp: stableOnTimeUp,
  });

  // CrazyGames SDK lifecycle events (gameplayStart/Stop, happyTime)
  useCrazyGamesLifecycle({
    isGameActive: !isGameOver && timer.remainingTime > 0,
    isGameOver,
    score,
    maxCombo: combo.maxCombo,
  });

  // Word submission - handles validation, dictionary checks, and feedback
  const wordSubmission = useWordSubmission({
    grid,
    language,
    minWordLength: 3,
    enableSpamDetection: false, // Daily challenge doesn't need spam detection
    fireRoundActive: false,
    comboLevel: combo.comboLevel,
    t,
    onWordAccepted: (word, wordScore) => {
      setScore(prev => prev + wordScore);
      playWordAcceptedSound?.();
      combo.incrementCombo(true);
    },
    onWordRejected: () => {
      combo.resetCombo();
    },
    onWordPending: () => {
      combo.resetCombo();
    },
    onComboReset: () => {
      combo.resetCombo();
    },
    onComboIncrement: (autoValidated) => {
      if (autoValidated) {
        combo.incrementCombo(true);
      }
    },
  });

  // Game music - handles in-game music, urgent music after 33% elapsed
  useGameMusic({
    phase: 'playing',
    remainingTime: timer.remainingTime,
    totalTime: duration,
    isPaused: isGameOver,
    enabled: true,
  });

  // Swipe tip guidance - shows after 15 seconds if player hasn't submitted any words
  // Helps new players understand they need to swipe to form words
  const isGameActive = !isGameOver && timer.remainingTime > 0;
  useSwipeTipGuidanceTrigger(
    wordSubmission.validWordCount + wordSubmission.foundWords.filter(w => w.isValid === null).length,
    contextualGuidance.triggerSwipeTipGuidance,
    isGameActive,
    15 // 15 seconds delay
  );

  // First-play tutorial - shows highlighted word path until player uses combined directions
  const firstPlayTutorial = useFirstPlayTutorial({
    grid,
    availableWords,
    language,
    isGameActive,
  });

  // Stop music on unmount
  useEffect(() => {
    return () => {
      stopMusic(500);
    };
  }, [stopMusic]);

  // Game end handler - validates pending words with AI before completing
  const handleGameEnd = useCallback(async () => {
    if (gameOverCalledRef.current) return;
    gameOverCalledRef.current = true;
    setIsGameOver(true);

    const currentWords = wordSubmission.foundWords;

    // Use shared utility for batch word validation
    const finalWords = await finalizeWordValidation(currentWords, language, 3);

    // Check if component unmounted during async validation
    if (!isMountedRef.current) return;

    // Calculate final score from validated words only
    const validWords = finalWords.filter(w => w.isValid === true);
    const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);
    const words = validWords.map(w => w.word);

    // Calculate words by length
    const wordsByLength: Record<number, number> = {};
    words.forEach(word => {
      const len = word.length;
      wordsByLength[len] = (wordsByLength[len] || 0) + 1;
    });

    // Find longest word
    const longestWord = words.reduce((longest, word) =>
      word.length > longest.length ? word : longest, '');

    const gameResult: DailyChallengeGameResult = {
      score: finalScore,
      wordCount: words.length,
      wordsByLength,
      timeSeconds: duration - timer.remainingTimeRef.current,
      words,
      longestWord,
    };

    // Only call onComplete if component is still mounted
    if (isMountedRef.current) {
      onComplete(gameResult);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, onComplete, language, wordSubmission.foundWords]);

  // Keep handleGameEnd ref in sync for stable timer callback
  useEffect(() => {
    handleGameEndRef.current = handleGameEnd;
  }, [handleGameEnd]);

  // Open quit confirmation dialog
  const handleQuitClick = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  // Confirm quit - mark as played with score 0
  const handleConfirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    const result: DailyChallengeGameResult = {
      score: 0,
      wordCount: 0,
      wordsByLength: {},
      timeSeconds: duration - timer.remainingTimeRef.current,
      words: [],
      longestWord: '',
    };
    onComplete(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, onComplete]);

  // Combined path submit handler for guidance systems
  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    // Track for direction guidance
    directionGuidance.trackWordPath(cells);
    // Track for first-play tutorial (detect mixed-direction usage)
    firstPlayTutorial.trackUserPath(cells);
  }, [directionGuidance, firstPlayTutorial]);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Handle word submission from grid
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;
    wordSubmission.submitWord(word);
  }, [isGameOver, wordSubmission]);

  // Keyboard word input - allows typing words directly instead of swiping
  const keyboardInput = useKeyboardWordInput({
    grid,
    language,
    enabled: !isGameOver,
    onWordSubmit: handleWordSubmit,
    minWordLength: 3,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex-1 flex flex-col p-2 sm:p-4 overflow-hidden",
        isLandscape && "flex-row"
      )}
    >
      {/* Top bar with quit button - matches multiplayer layout */}
      <div className={cn(
        "flex items-center justify-between mb-2 px-2",
        isLandscape && "hidden"
      )}>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleQuitClick}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold"
        >
          <X className="w-4 h-4 mr-1" />
          {t('common.quit') || 'Quit'}
        </Button>
        {/* Puzzle number badge */}
        <span className="px-2 py-0.5 bg-neo-lime/20 text-neo-black dark:text-neo-lime text-xs font-bold rounded-full">
          #{puzzleNumber}
        </span>
      </div>

      {/* Stats row - Combo | Timer | Score - matches multiplayer InGameScreen */}
      <div className={cn(
        "flex items-center justify-center gap-3 md:gap-4 mb-2",
        isLandscape && "flex-col h-full mr-4 mb-0"
      )} role="status" aria-label="Game status">
        {/* Combo (left - placeholder for layout balance) */}
        <div className="min-w-[70px] md:min-w-[90px] flex justify-end">
          <ComboDisplay
            comboLevel={combo.comboLevel}
            compact
            coinReward={comboCoinReward}
            onCoinAnimationComplete={() => setComboCoinReward(null)}
          />
        </div>

        {/* Timer (center - always visible and prominent) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-20"
        >
          <div className="hidden lg:block">
            <CircularTimer remainingTime={timer.remainingTime} totalTime={duration} size="lg" />
          </div>
          <div className="lg:hidden">
            <CircularTimer remainingTime={timer.remainingTime} totalTime={duration} size="md" />
          </div>
        </motion.div>

        {/* Score (right position) - vibrant yellow/lime gradient like multiplayer */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-3 md:px-4 py-1.5 min-w-[70px] md:min-w-[90px]"
          style={{
            background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
          }}
        >
          <div className="text-center">
            <motion.div
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-xl md:text-2xl font-black text-neo-black leading-tight"
              style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
            >
              {score}
            </motion.div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-neo-black/80">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Achievement Progress Tracker - shows near-completion achievements, auto-dismisses 2s after game ends */}
      <AchievementProgressTracker
        validWordCount={wordSubmission.validWordCount}
        comboLevel={combo.comboLevel}
        maxCombo={combo.maxCombo}
        wordLengths={wordSubmission.foundWords.filter(w => w.isValid === true).map(w => w.word.length)}
        timeSinceStart={duration - timer.remainingTime}
        gameDuration={duration}
        earnedAchievements={[]}
        isGameOver={isGameOver}
      />

      {/* Word Forming Area with feedback - centered below timer */}
      <div className={cn("flex items-center justify-center mb-1", isLandscape && "hidden")}>
        <WordFormingArea
          word={formedWord}
          letterCount={letterCount}
          feedback={wordSubmission.currentFeedback}
          compact
        />
      </div>

      {/* Game Grid */}
      <div className={cn(
        "flex-1 flex items-center justify-center",
        isLandscape && "items-start"
      )}>
        <GridComponent
          grid={grid}
          interactive={!isGameOver}
          onWordSubmit={handleWordSubmit}
          onPathSubmit={handlePathSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator={true}
          comboLevel={combo.comboLevel}
          highlightedPath={
            // Keyboard typing takes priority over tutorial path
            keyboardInput.highlightedCells.length > 0
              ? keyboardInput.highlightedCells
              : firstPlayTutorial.tutorialPath
              ? firstPlayTutorial.tutorialPath.map(p => ({ row: p.row, col: p.col }))
              : undefined
          }
        />
      </div>

      {/* Word count */}
      <div className="text-center mt-2 sm:mt-4">
        <span className="text-sm text-gray-600">
          {t('daily.wordsFound').replace('{count}', String(wordSubmission.validWordCount))}
          {wordSubmission.foundWords.filter(w => w.isValid === null).length > 0 && (
            <span className="text-neo-lime ml-1">
              (+{wordSubmission.foundWords.filter(w => w.isValid === null).length} {t('common.pending') || 'pending'})
            </span>
          )}
        </span>
      </div>

      {/* Direction Guidance Tooltip - shows when player only uses straight-line directions */}
      <DirectionGuidanceTooltip
        isVisible={directionGuidance.showDirectionGuidance}
        onDismiss={directionGuidance.dismissDirectionGuidance}
        t={t}
      />

      {/* Swipe Tip Tooltip - shows after 15 seconds if player hasn't submitted any words */}
      <SwipeTipTooltip
        isVisible={contextualGuidance.showSwipeTip}
        onDismiss={contextualGuidance.dismissSwipeTip}
        t={t}
      />

      {/* Keyboard Input Hint - Desktop only */}
      {!isGameOver && (
        <KeyboardHintTooltip
          delaySeconds={10}
          desktopOnly={true}
          t={t}
        />
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('daily.quitConfirmTitle') || 'Quit Challenge?'}
        description={t('daily.quitConfirm') || 'If you quit, this will count as your attempt for today. You won\'t be able to try again until tomorrow.'}
        confirmText={t('daily.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={handleConfirmQuit}
        variant="danger"
      />
    </motion.div>
  );
};

export default DailyChallengeGame;
