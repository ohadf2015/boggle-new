'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { m } from 'framer-motion';
import { X } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import WordFormingArea from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { AchievementProgressTracker } from '@/components/achievements/AchievementProgressTracker';
import { ScorePopupFly } from '@/components/animations/ScorePopupFly';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useDirectionsTutorialPause } from '@/hooks/useDirectionsTutorialPause';
import { DirectionsTutorialOverlay } from '@/components/tutorial/DirectionsTutorialOverlay';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useDirectionPatternGuidance } from '@/hooks/useDirectionPatternGuidance';
import { useContextualGuidance, useSwipeTipGuidanceTrigger } from '@/hooks/useContextualGuidance';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import DirectionGuidanceTooltip from '@/components/game/DirectionGuidanceTooltip';
import KeyboardHintTooltip from '@/components/game/KeyboardHintTooltip';
import { cn } from '@/lib/utils';
import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';
import { useCoinContext } from '@/contexts/CoinContext';
import { Mascot } from '@/components/ui/Mascot';
import { PANIC_TIMER_THRESHOLD, ONFIRE_COMBO_THRESHOLD } from '@/utils/mascotConfig';
import { useScorePopup } from './useScorePopup';
import { buildGameResult, type DailyChallengeGameResult } from './dailyChallengeGameUtils';
import type { LetterGrid, Language } from '@/types';

interface DailyChallengeGameProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  duration: number; // in seconds
  onComplete: (result: DailyChallengeGameResult) => void;
  onQuit: () => void;
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
  const { t, dir, language: uiLanguage } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, playComboSound, playCountdownBeep, playWordLengthSound, setGameActive } = useSoundEffects();
  const { stopMusic } = useMusic();
  const { awardComboMilestone } = useCoinContext();
  const { isLowEnd } = useDevicePerformance();

  // Game state
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);


  // Exit confirmation dialog state
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Guard against accidental browser back button / tab close during active game
  // Daily challenge is one-per-day so always guard (unlike single player which waits for score > 0)
  useNavigationGuard({
    enabled: !isGameOver,
    message: t('daily.quitConfirm'),
    onNavigationAttempt: () => {
      setShowQuitConfirm(true);
      return false; // Block navigation, let modal handle it
    },
  });

  // Coin reward animation state
  const [comboCoinReward, setComboCoinReward] = useState<number | null>(null);

  // Refs for anchoring the floating score popup to real HUD elements
  const scoreBadgeRef = useRef<HTMLDivElement>(null);
  const wordAreaRef = useRef<HTMLDivElement>(null);

  // Score popup hook - stable IDs via ref, stable clearPopup via useCallback
  const { scorePopup, triggerPopup, clearPopup } = useScorePopup({ originRef: wordAreaRef });

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

  // Funnel parity: emit game_started once on mount to pair with trackGameEnd('daily-challenge', ...)
  useEffect(() => {
    trackGameStart('daily-challenge', { puzzleNumber, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enable sound effects when game is active, disable when leaving
  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, [setGameActive]);

  // Stable callback for timer - prevents timer restart on every render
  const stableOnTimeUp = useCallback(() => {
    if (!gameOverCalledRef.current) {
      handleGameEndRef.current?.();
    }
  }, []);

  // === SHARED HOOKS ===

  // Combo system - handles combo state, refs, and timeouts
  const combo = useComboSystem({
    timerIntervalMs: isLowEnd ? 500 : 250,
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

  // Freeze the clock while the first-time "any direction" tutorial covers the
  // board so a brand-new player's first puzzle doesn't tick down as they read it.
  const isDirectionsTutorialActive = useDirectionsTutorialPause();

  // Game timer - handles countdown with callbacks
  // Uses stableOnTimeUp to prevent timer restart on re-renders
  const timer = useGameTimer({
    initialTime: duration,
    isPaused: isGameOver,
    isExternallyPaused: isDirectionsTutorialActive,
    onTimeUp: stableOnTimeUp,
  });

  // Countdown beep in last 10 seconds
  useEffect(() => {
    if (!isGameOver && timer.remainingTime <= 10 && timer.remainingTime > 0) {
      playCountdownBeep(timer.remainingTime);
    }
  }, [timer.remainingTime, isGameOver, playCountdownBeep]);

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
    minWordLength: 2,
    enableSpamDetection: false, // Daily challenge doesn't need spam detection
    mode: 'daily',
    fireRoundActive: false,
    comboLevel: combo.comboLevel,
    t,
    onWordAccepted: (word, wordScore) => {
      // Combo already incremented optimistically in onComboIncrement
      setScore(prev => prev + wordScore);
      playWordAcceptedSound?.();
      if (word.length >= 5) {
        playWordLengthSound?.(word.length);
      }
      triggerPopup(wordScore, word);
    },
    onWordRejected: () => {
      playWordRejectedSound();
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


  // Stop music on unmount
  useEffect(() => {
    return () => {
      stopMusic(500);
    };
  }, [stopMusic]);

  // Game end handler - no AI validation, treat pending as invalid
  const handleGameEnd = useCallback(() => {
    if (gameOverCalledRef.current) return;
    gameOverCalledRef.current = true;
    setIsGameOver(true);

    const currentWords = wordSubmission.foundWords;

    // No AI validation - treat pending words (isValid: null) as invalid
    const finalWords = currentWords.map(w => ({
      ...w,
      isValid: w.isValid === true, // null or false becomes false
    }));

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

    trackGameEnd(
      'daily-challenge',
      finalScore,
      words.length,
      true,
      gameResult.timeSeconds,
      { isWinner: words.length > 0, puzzleNumber }
    );

    // Only call onComplete if component is still mounted
    if (isMountedRef.current) {
      onComplete(gameResult);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, onComplete, language, wordSubmission.foundWords]);

  const validWordLengths = useMemo(
    () => wordSubmission.foundWords.filter(w => w.isValid === true).map(w => w.word.length),
    [wordSubmission.foundWords]
  );

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
    trackGameEnd('daily-challenge', 0, 0, false, result.timeSeconds, { puzzleNumber });
    onComplete(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, onComplete]);

  // Combined path submit handler for guidance systems
  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    // Track for direction guidance
    directionGuidance.trackWordPath(cells);
  }, [directionGuidance]);

  // Handle word forming changes from GridComponent
  // Also prefetch validation while user is swiping for instant submit
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
    if (word.length >= 3) {
      wordSubmission.prefetchValidation(word);
    }
  }, [wordSubmission]);

  // Handle word submission from grid
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;
    wordSubmission.submitWord(word);
  }, [isGameOver, wordSubmission]);

  // Keyboard word input - allows typing words directly instead of swiping
  const keyboardInput = useKeyboardWordInput({
    grid,
    language,
    gameLanguage: language,
    enabled: !isGameOver,
    onWordSubmit: handleWordSubmit,
    minWordLength: 2,
  });

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex-1 flex flex-col p-2 sm:p-4 overflow-hidden",
        false &&"flex-row"
      )}
      translate="no"
    >
      {/* First-time-only "trace in ANY direction" tutorial (once per device,
          global gate, freezes the clock while up). */}
      <DirectionsTutorialOverlay />

      {/* Top bar with quit button - matches multiplayer layout */}
      <div className={cn(
        "flex items-center justify-between mb-2 px-2",
        false &&"hidden"
      )}>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleQuitClick}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold"
        >
          <X className="w-4 h-4 me-1" />
          {t('common.quit')}
        </Button>
        {/* Puzzle number badge */}
        <span className="px-2 py-0.5 bg-neo-lime/20 text-neo-black dark:text-neo-lime text-xs font-bold rounded-full">
          #{puzzleNumber}
        </span>
      </div>

      {/* Stats row - Combo | Timer | Score - matches multiplayer InGameScreen */}
      <div ref={wordAreaRef} className={cn(
        "flex items-center justify-center gap-3 md:gap-4 mb-2",
        false &&"flex-col h-full me-4 mb-0"
      )} role="status" aria-label="Game status">
        {/* Combo (left - placeholder for layout balance) */}
        <div className="min-w-[80px] md:min-w-[100px] flex justify-end">
          <ComboDisplay
            comboLevel={combo.comboLevel}
            compact
            timeRemaining={combo.comboTimeRemaining}
            isDanger={combo.isDangerState}
            coinReward={comboCoinReward}
            onCoinAnimationComplete={() => setComboCoinReward(null)}
          />
        </div>

        {/* Timer (center - always visible and prominent) */}
        <m.div
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
        </m.div>

        {/* Score (right position) - vibrant yellow/lime gradient like multiplayer */}
        <m.div
          ref={scoreBadgeRef}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-3 md:px-4 py-1.5 min-w-[80px] md:min-w-[100px]"
          style={{
            background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
          }}
        >
          <div className="text-center">
            <m.div
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-xl md:text-2xl font-black text-neo-black leading-tight whitespace-nowrap tabular-nums"
              style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
            >
              {score.toLocaleString()}
            </m.div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-neo-black/80">
              {t('common.score')}
            </div>
          </div>
        </m.div>
      </div>

      {/* Conditional mascots: panic when time runs low, onfire when on a hot streak */}
      <div className="relative h-0">
        {/* Panic mascot: urgency indicator when clock runs low */}
        {timer.remainingTime <= PANIC_TIMER_THRESHOLD && (
          <div className="absolute top-2 inset-e-2 z-10 pointer-events-none">
            <Mascot variant="panic" size="sm" animated clipBorder="none" />
          </div>
        )}

        {/* On-fire mascot: celebrates active combo streaks */}
        {combo.comboLevel >= ONFIRE_COMBO_THRESHOLD && timer.remainingTime > PANIC_TIMER_THRESHOLD && (
          <div className="absolute top-2 inset-s-2 z-10 pointer-events-none">
            <Mascot variant="onfire" size="sm" animated clipBorder="none" />
          </div>
        )}
      </div>

      {/* Achievement Progress Tracker - shows near-completion achievements, auto-dismisses 2s after game ends */}
      <AchievementProgressTracker
        validWordCount={wordSubmission.validWordCount}
        comboLevel={combo.comboLevel}
        maxCombo={combo.maxCombo}
        wordLengths={validWordLengths}
        timeSinceStart={duration - timer.remainingTime}
        gameDuration={duration}
        earnedAchievements={[]}
        isGameOver={isGameOver}
      />

      {/* Word Forming Area with feedback - centered below timer */}
      <div className={cn("flex items-center justify-center mb-1", false &&"hidden")}>
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
        false &&"items-start"
      )}>
        <GridComponent
          grid={grid}
          interactive={!isGameOver}
          onWordSubmit={handleWordSubmit}
          onPathSubmit={handlePathSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator={true}
          animateOnMount={true}
          comboLevel={combo.comboLevel}
          highlightedPath={
            keyboardInput.highlightedCells.length > 0
              ? keyboardInput.highlightedCells
              : undefined
          }
          submitFeedback={wordSubmission.currentFeedback}
        />
      </div>

      {/* Word count */}
      <div className="text-center mt-2 sm:mt-4">
        <span className="text-sm text-gray-600">
          {t('daily.wordsFound').replace('{count}', String(wordSubmission.validWordCount))}
        </span>
      </div>

      {/* Direction Guidance Tooltip - shows when player only uses straight-line directions */}
      <DirectionGuidanceTooltip
        isVisible={directionGuidance.showDirectionGuidance}
        onDismiss={directionGuidance.dismissDirectionGuidance}
        t={t}
        dir={dir}
        language={uiLanguage}
      />

      {/* Keyboard Input Hint - Desktop only */}
      {!isGameOver && (
        <KeyboardHintTooltip delaySeconds={10} desktopOnly={true} t={t} />
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('daily.quitConfirmTitle')}
        description={t('daily.quitConfirm')}
        confirmText={t('daily.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmQuit}
        variant="danger"
        analyticsId="daily_quit_confirm"
      />

      {/* Score popup fly animation - shows +N when a word is accepted */}
      <ScorePopupFly
        popup={scorePopup}
        flyToTarget
        targetRef={scoreBadgeRef}
        showWord
        onComplete={clearPopup}
      />
    </m.div>
  );
};

export default DailyChallengeGame;
