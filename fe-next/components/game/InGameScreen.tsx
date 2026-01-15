'use client';

import React, { ReactNode, useRef, useEffect, useCallback, useMemo, memo, useState, useTransition, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy, Crown, HelpCircle } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import ExitRoomButton from '../ExitRoomButton';
import Avatar from '../Avatar';
import PresenceIndicator from '../PresenceIndicator';
import GridComponent from '../GridComponent';
import CircularTimer from '../CircularTimer';
import RoomChat from '../RoomChat';
import { EarthquakeWarning, FireRoundIndicator } from '../earthquake';
import HintButton from '../HintButton';
import WordFormingArea, { type WordFeedback } from './WordFormingArea';
import ComboDisplay from './ComboDisplay';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { wordErrorToast } from '../NeoToast';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useAnnouncer } from '../GameAnnouncer';
import { validateWordLocally, couldBeOnBoard } from '../../utils/clientWordValidator';
import { hapticForWordScore, hapticError } from '../../utils/haptics';
import { getRankStyle, getRankIconString } from '../../utils/rankingStyles';
import type { LetterGrid, Language } from '@/shared/types/game';
import type {
  FoundWord,
  ExtendedLeaderboardPlayer as LeaderboardPlayer,
  TournamentData,
} from '@/shared/types/view';
import type { BoardTheme } from '@/shared/types/socket';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useAutoScrollOnGameStart } from '@/hooks/useAutoScrollOnGameStart';
import { WordsRemaining } from '@/player/components/in-game/WordsRemaining';
import { getPerformanceConfig } from '../grid/performanceUtils';
import { useTapToDragGuidance } from '@/hooks/useTapToDragGuidance';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useKeyboardHelpState } from '@/hooks/useKeyboardHelpState';
import KeyboardHintTooltip from './KeyboardHintTooltip';
import TapToDragTooltip from './TapToDragTooltip';
import { KeyboardShortcutsOverlay, KeyboardModeIndicator, KeyboardQuickTip } from '../keyboard';
import CompactLeaderboard, { type CompactPlayer } from './CompactLeaderboard';
import { shouldShowKeyboardTrails } from './keyboardTrailsUtils';
import ScoreBreakdownTooltip from './ScoreBreakdownTooltip';

// ==================== Types ====================

interface HintsState {
  hint: string | null;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category' | null;
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  isSinglePlayer: boolean;
  requestHint: () => void;
  clearHint: () => void;
}

// ==================== Constants ====================

/** Re-render interval for keyboard trails visibility check */
const TRAILS_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

interface InGameScreenProps {
  // Core identity
  username: string;
  gameCode: string;
  isHost?: boolean;
  isPlaying?: boolean; // For host: whether they're actively playing or spectating
  t: (path: string, params?: Record<string, string | number>) => string;
  dir?: 'rtl' | 'ltr';
  socket: Socket | null;

  // Game state
  letterGrid: LetterGrid;
  remainingTime: number | null;
  timerValue?: number; // Timer duration in minutes
  gameActive?: boolean;
  showStartAnimation?: boolean;
  gameLanguage?: Language | null;
  minWordLength?: number;
  comboLevel?: number;
  comboLevelRef?: React.MutableRefObject<number>;
  /** Time remaining for combo as percentage (0-100), null when no active combo */
  comboTimeRemaining?: number | null;
  /** Whether combo timer is in danger zone (<30% remaining) */
  comboDanger?: boolean;

  // Player data
  foundWords?: FoundWord[] | string[];
  leaderboard?: LeaderboardPlayer[];
  totalBoardWords?: number | null;

  // Callbacks
  onExitRoom?: () => void;
  onWordSubmit?: (word: string) => void;
  onResetCombo?: () => void;

  // Tournament (optional)
  tournamentData?: TournamentData | null;

  // Hints (single-player mode)
  hints?: HintsState;

  // Earthquake/Fire Round
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;

  // Focus mode - hides leaderboard and chat during gameplay
  gameplayFocusMode?: boolean;

  // Achievement dock (rendered outside this component)
  children?: ReactNode;

  // Board theme (date-themed words indicator)
  boardTheme?: BoardTheme | null;

  // Player experience - used to determine inactivity threshold for keyboard trails
  // New players (0-1 games) see trails sooner (10s) as tutorial help
  // Experienced players (2+ games) see trails later (30s) when truly stuck
  totalGamesPlayed?: number;

  // Tutorial callback - opens onboarding tutorial
  onShowTutorial?: () => void;
}

// ==================== Component ====================

/**
 * InGameScreen - Unified in-game screen component for both Host and Player views
 * Shows active game state with grid, timer, found words, and leaderboard
 * Ensures consistent UI between host and player during gameplay
 */
const InGameScreen = memo<InGameScreenProps>(({
  // Core identity
  username,
  gameCode,
  isHost = false,
  isPlaying = true,
  t,
  dir = 'ltr',
  socket,

  // Game state
  letterGrid,
  remainingTime,
  timerValue = 3,
  gameActive = true,
  showStartAnimation = false,
  gameLanguage = 'en',
  minWordLength = 2,
  comboLevel = 0,
  comboLevelRef,
  comboTimeRemaining = null,
  comboDanger = false,

  // Player data
  foundWords = [],
  leaderboard = [],
  totalBoardWords = null,

  // Callbacks
  onExitRoom,
  onWordSubmit,
  onResetCombo,

  // Tournament
  tournamentData = null,

  // Hints
  hints,

  // Earthquake/Fire Round
  earthquakeState = 'idle',
  fireRoundActive = false,
  fireRoundRemaining = 0,

  // Focus mode
  gameplayFocusMode = false,

  // Achievement dock
  children,

  // Board theme
  boardTheme,

  // Player experience
  totalGamesPlayed,

  // Tutorial callback
  onShowTutorial,
}) => {
  const {
    playWordAcceptedSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
    setGameActive,
  } = useSoundEffects();
  const { announceWordResult, announceTimer } = useAnnouncer();
  const isLandscape = useMobileLandscape();

  // Enable sound effects when in-game, disable when leaving
  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, [setGameActive]);

  // Announce timer at key intervals for screen reader users
  useEffect(() => {
    if (remainingTime !== null && gameActive) {
      announceTimer(remainingTime);
    }
  }, [remainingTime, gameActive, announceTimer]);

  // CrazyGames SDK lifecycle events (gameplayStart/Stop, happyTime)
  // In multiplayer, game ends when remainingTime hits 0
  const isGameOver = remainingTime === 0;
  useCrazyGamesLifecycle({
    isGameActive: gameActive && !isGameOver,
    isGameOver,
    maxCombo: comboLevel,
  });

  // Mobile tab state for words/leaderboard toggle
  const [mobileActiveTab, setMobileActiveTab] = useState<'words' | 'leaderboard'>('words');

  // Use transition for non-urgent UI updates (leaderboard, word list)
  const [isPending, startTransition] = useTransition();

  // Defer expensive leaderboard calculations for smoother UI
  const deferredLeaderboard = useDeferredValue(leaderboard);

  // Defer found words updates for better performance during rapid word submissions
  const deferredFoundWords = useDeferredValue(foundWords);

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);

  // Feedback state (for WordFormingArea)
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

  // Track when the last word was found - used for inactivity-based keyboard trail visibility
  // Trails are shown only when player hasn't found a word for a while (30+ seconds)
  // Initialize to Date.now() if game is already active to prevent trails from showing immediately
  const [lastWordFoundTime, setLastWordFoundTime] = useState<number>(() => gameActive ? Date.now() : 0);

  // Force re-render periodically to check trail visibility based on time elapsed
  const [, setTrailsCheckTick] = useState(0);
  useEffect(() => {
    if (!gameActive || !isPlaying) return;
    const interval = setInterval(() => {
      setTrailsCheckTick(tick => tick + 1);
    }, TRAILS_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [gameActive, isPlaying]);

  // Reset lastWordFoundTime to current time when game starts or becomes active
  // This ensures keyboard trails don't show immediately - they'll only
  // appear after the inactivity threshold (10s new players, 30s experienced)
  useEffect(() => {
    if (gameActive) {
      setLastWordFoundTime(Date.now());
    }
  }, [gameActive]);

  // Viewport height detection for very short landscape screens
  const [viewportHeight, setViewportHeight] = useState(0);

  // Ref for auto-scroll target (timer/stats section in portrait mode)
  const gameStatsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to game area on game start in portrait mode
  useAutoScrollOnGameStart(gameStatsRef, {
    gameActive,
    isLandscape,
    showStartAnimation,
  });

  // Tap-to-drag guidance - shows when player taps single letter without dragging
  const tapDragGuidance = useTapToDragGuidance();

  // Track viewport height for responsive landscape adjustments
  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  // Track previous earthquake state to detect transitions
  const prevEarthquakeStateRef = useRef<typeof earthquakeState>('idle');
  const prevFireRoundActiveRef = useRef(false);

  // Track current fireRoundActive value via ref for use in callbacks
  // This ensures the socket emit uses the latest value without waiting for re-render
  const fireRoundActiveRef = useRef(fireRoundActive);
  useEffect(() => {
    fireRoundActiveRef.current = fireRoundActive;
  }, [fireRoundActive]);

  // Earthquake/Fire Round sound effects for multiplayer (triggered by state changes from socket)
  useEffect(() => {
    const prevState = prevEarthquakeStateRef.current;
    const prevFireActive = prevFireRoundActiveRef.current;

    // Trigger sounds based on state transitions
    if (earthquakeState === 'warning' && prevState !== 'warning') {
      playEarthquakeRumble();
      // Haptic feedback for warning
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 100, 150, 100, 200]);
      }
    } else if (earthquakeState === 'shaking' && prevState !== 'shaking') {
      playEarthquakeShake();
      // Haptic feedback for shake
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 400, 150, 300]);
      }
    }

    // Fire round start
    if (fireRoundActive && !prevFireActive) {
      playFireRoundStart();
      startFireCrackleLoop();
      // Haptic feedback for fire round
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }

    // Fire round end
    if (!fireRoundActive && prevFireActive) {
      stopFireCrackleLoop();
    }

    // Update refs for next comparison
    prevEarthquakeStateRef.current = earthquakeState;
    prevFireRoundActiveRef.current = fireRoundActive;
  }, [earthquakeState, fireRoundActive, playEarthquakeRumble, playEarthquakeShake, playFireRoundStart, startFireCrackleLoop, stopFireCrackleLoop]);

  // Track if grid animation has already played
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  // Listen for word feedback socket events to update WordFormingArea
  useEffect(() => {
    if (!socket || !isPlaying) return;

    const handleWordAccepted = (data: { word: string; score: number; comboLevel?: number; fireRoundActive?: boolean; fireRoundBonus?: number }) => {
      // Track when the last word was found for inactivity-based trail visibility
      setLastWordFoundTime(Date.now());
      setCurrentFeedback({
        id: `accepted-${Date.now()}`,
        type: 'accepted',
        word: data.word,
        score: data.score,
        fireRoundActive: data.fireRoundActive,
        fireRoundBonus: data.fireRoundBonus,
        timestamp: Date.now(),
      });
    };

    const handleWordAlreadyFound = (data: { word: string }) => {
      setCurrentFeedback({
        id: `duplicate-${Date.now()}`,
        type: 'duplicate',
        word: data.word,
        message: t('playerView.alreadyFound') || 'Already found',
        timestamp: Date.now(),
      });
    };

    const handleWordNeedsValidation = (data: { word: string; message?: string }) => {
      setCurrentFeedback({
        id: `pending-${Date.now()}`,
        type: 'pending',
        word: data.word,
        message: data.message || t('playerView.pendingValidation') || 'Pending validation',
        timestamp: Date.now(),
      });
    };

    const handleWordRejected = (data: { word: string; reason?: string }) => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: data.reason || t('playerView.invalidWord') || 'Invalid word',
        timestamp: Date.now(),
      });
    };

    const handleWordNotOnBoard = (data: { word: string }) => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t('playerView.wordNotOnBoard') || 'Not on board',
        timestamp: Date.now(),
      });
    };

    const handleWordTooShort = (data: { word: string; minLength?: number }) => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t('playerView.wordTooShort') || 'Too short',
        timestamp: Date.now(),
      });
    };

    const handleWordAlreadyFoundByOther = (data: { word: string; foundBy: string; foundByAvatar?: { emoji?: string; color?: string; avatarImage?: string } | null }) => {
      setCurrentFeedback({
        id: `foundByOther-${Date.now()}`,
        type: 'foundByOther',
        word: data.word,
        message: t('playerView.foundByOther')?.replace('${player}', data.foundBy) || `Found by ${data.foundBy}`,
        foundBy: data.foundBy,
        foundByAvatar: data.foundByAvatar,
        timestamp: Date.now(),
      });
    };

    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordAlreadyFoundByOther', handleWordAlreadyFoundByOther);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordTooShort', handleWordTooShort);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordAlreadyFoundByOther', handleWordAlreadyFoundByOther);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('wordRejected', handleWordRejected);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordTooShort', handleWordTooShort);
    };
  }, [socket, isPlaying, t]);

  // Create a ref for combo if not provided
  const internalComboLevelRef = useRef(comboLevel);
  useEffect(() => {
    internalComboLevelRef.current = comboLevel;
  }, [comboLevel]);
  const effectiveComboLevelRef = comboLevelRef || internalComboLevelRef;

  // Normalize found words to FoundWord format (using deferred value for smoother updates)
  const normalizedFoundWords: FoundWord[] = useMemo(() => {
    return deferredFoundWords.map(w =>
      typeof w === 'string' ? { word: w, isValid: true } : w
    );
  }, [deferredFoundWords]);

  // Calculate player's score and rank from leaderboard
  const playerData = useMemo(() => {
    const playerEntry = leaderboard.find(p => p.username === username);
    const playerRank = leaderboard.findIndex(p => p.username === username) + 1;
    return {
      score: playerEntry?.score ?? 0,
      rank: playerRank > 0 ? playerRank : null,
    };
  }, [leaderboard, username]);

  // Word submission handler with validation
  const handleGridWordSubmit = useCallback((formedWord: string): void => {
    if (!isPlaying) return;

    const currentLang = gameLanguage || 'en';

    // Client-side validation
    const validation = validateWordLocally(formedWord, currentLang, minWordLength, normalizedFoundWords);

    if (!validation.isValid) {
      let msg: string;
      const isDuplicate = validation.errorKey === 'playerView.wordAlreadyFound';

      if (validation.errorKey === 'playerView.wordTooShortMin') {
        msg = t('playerView.wordTooShortMin')
          ? t('playerView.wordTooShortMin').replace('${min}', String(validation.errorParams?.min || minWordLength))
          : `Word too short! (min ${validation.errorParams?.min || minWordLength} letters)`;
      } else if (validation.errorKey === 'playerView.wordTooShort') {
        msg = t('playerView.wordTooShort') || 'Word too short';
      } else if (isDuplicate) {
        msg = t('playerView.alreadyFound') || 'Already found';
      } else {
        const errorKey = validation.errorKey ?? 'Invalid word';
        msg = t(errorKey) || errorKey;
      }
      // Show feedback in WordFormingArea - use 'duplicate' type for already found words
      setCurrentFeedback({
        id: isDuplicate ? `duplicate-${Date.now()}` : `reject-${Date.now()}`,
        type: isDuplicate ? 'duplicate' : 'rejected',
        word: formedWord,
        message: msg,
        timestamp: Date.now(),
      });
      // Haptic feedback for error
      hapticError();
      // Announce rejection for screen readers
      announceWordResult(formedWord, false, undefined, msg);
      // Reset combo if duplicate word
      if (isDuplicate && onResetCombo) {
        onResetCombo();
      }
      return;
    }

    // Check if word can be on board
    if (!couldBeOnBoard(formedWord, letterGrid, currentLang)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard');
      // Show feedback in WordFormingArea
      setCurrentFeedback({
        id: `reject-${Date.now()}`,
        type: 'rejected',
        word: formedWord,
        message: notOnBoardMsg,
        timestamp: Date.now(),
      });
      hapticError();
      announceWordResult(formedWord, false, undefined, notOnBoardMsg);
      return;
    }

    // Play sound and haptic feedback immediately (optimistic)
    playWordAcceptedSound();
    hapticForWordScore(formedWord.length);

    // Submit to server
    if (!socket || !gameActive) return;
    socket.emit('submitWord', {
      word: formedWord.toLowerCase(),
      comboLevel: Math.min(effectiveComboLevelRef.current, 10),
      fireRoundActive: fireRoundActiveRef.current,
    });

    // Add to local found words
    onWordSubmit?.(formedWord);
  }, [
    isPlaying,
    gameLanguage,
    minWordLength,
    normalizedFoundWords,
    letterGrid,
    gameActive,
    socket,
    onWordSubmit,
    onResetCombo,
    t,
    playWordAcceptedSound,
    announceWordResult,
    effectiveComboLevelRef,
  ]);

  // Keyboard word input - allows typing words directly instead of swiping
  const keyboardInput = useKeyboardWordInput({
    grid: letterGrid,
    language: gameLanguage || 'en',
    gameLanguage: gameLanguage,
    enabled: isPlaying && gameActive && !showStartAnimation,
    onWordSubmit: handleGridWordSubmit,
    minWordLength,
  });

  // Desktop detection for keyboard help features
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  // Keyboard help state - manages help overlay and quick tip visibility
  const keyboardHelp = useKeyboardHelpState({
    enabled: isDesktop && isPlaying,
    enableQuickTip: isDesktop,
  });

  // Memoize leaderboard items with centralized ranking utilities (using deferred value)
  const memoizedLeaderboard = useMemo(() => deferredLeaderboard.map((player, index) => ({
    ...player,
    rankStyle: getRankStyle(index),
    isMe: player.username === username,
    rankDisplay: getRankIconString(index)
  })), [deferredLeaderboard, username]);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Check for very short landscape screens to prevent panel overlap
  const isVeryShortLandscape = isLandscape && viewportHeight > 0 && viewportHeight < 400;
  const isExtremelyShortLandscape = isLandscape && viewportHeight > 0 && viewportHeight < 350;

  // ==================== Landscape Layout ====================
  // In landscape mobile mode, use a maximized grid layout with stats on sides
  if (isLandscape) {
    return (
      <>
        {/* Earthquake Warning Overlay */}
        <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

        {/* Fire Round Indicator */}
        <FireRoundIndicator
          isActive={fireRoundActive}
          remainingSeconds={fireRoundRemaining}
        />

        {/* Tap-to-drag guidance - shows when player taps single letter without dragging */}
        <TapToDragTooltip
          isVisible={tapDragGuidance.showDragTutorial}
          onDismiss={tapDragGuidance.dismissDragTutorial}
          t={t}
          dir={dir}
          language={gameLanguage || 'en'}
        />

        {/* Keyboard Input Hint - Desktop only (legacy fallback) */}
        {isPlaying && !keyboardHelp.showQuickTip && (
          <KeyboardHintTooltip
            delaySeconds={10}
            desktopOnly={true}
            t={t}
          />
        )}

        {/* Keyboard Quick Tip - Desktop only (immediate hint) */}
        {isPlaying && isDesktop && (
          <KeyboardQuickTip
            isVisible={keyboardHelp.showQuickTip}
            onDismiss={keyboardHelp.dismissQuickTip}
            t={t}
          />
        )}

        {/* Keyboard Mode Indicator - Desktop only */}
        {isPlaying && isDesktop && (
          <KeyboardModeIndicator
            isNavigationMode={false}
            isTypingMode={keyboardInput.isTypingMode}
            t={t}
            position="top-right"
          />
        )}

        {/* Keyboard Shortcuts Overlay - Desktop only */}
        {isDesktop && (
          <KeyboardShortcutsOverlay
            isOpen={keyboardHelp.isHelpOpen}
            onClose={keyboardHelp.closeHelp}
            t={t}
          />
        )}

        {/* Full-screen landscape container - grid prevents side-panel overlap */}
        <div className="relative w-full h-screen overflow-hidden bg-slate-900 text-white landscape-full-height">
          <div
            className="grid w-full h-full grid-rows-[1fr_auto] items-center"
            style={{
              gridTemplateColumns: 'clamp(70px, 14vw, 110px) minmax(0, 1fr) clamp(70px, 14vw, 110px)',
            }}
          >
            {/* Left Side Panel */}
            <div className="row-start-1 col-start-1 flex justify-start ps-1">
              <div className="landscape-panel flex flex-col items-center gap-2">
                {remainingTime !== null && (
                  <CircularTimer
                    remainingTime={remainingTime}
                    totalTime={timerValue * 60}
                    size={isExtremelyShortLandscape ? "md" : "lg"}
                  />
                )}

                {isPlaying && playerData.rank && playerData.rank > 0 && leaderboard.length > 1 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="landscape-stat-secondary text-white">
                      #{playerData.rank}
                    </div>
                    <div className="landscape-stat-label text-white">
                      {t('common.rank') || 'RANK'}
                    </div>
                  </motion.div>
                )}

                {isPlaying && (
                  <div className="flex flex-col items-center">
                    <div className="landscape-stat-secondary text-white">
                      {normalizedFoundWords.length}
                    </div>
                    <div className="landscape-stat-label text-white">
                      {t('common.words') || 'WORDS'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Word Forming Area + Grid */}
            <div className={cn(
              "row-start-1 col-start-2 flex flex-col items-center justify-center w-full h-full min-w-0",
              "gap-1.5 py-1"
            )}>
              {isPlaying && (
                <WordFormingArea
                  word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord}
                  letterCount={keyboardInput.isTypingMode ? keyboardInput.typedWord.length : letterCount}
                  feedback={currentFeedback}
                  compact
                  className="mb-1 flex-shrink-0 z-50"
                />
              )}
              <div className="flex-1 flex items-center justify-center game-board-frame-landscape min-w-0" style={{ aspectRatio: '1/1' }}>
                <GridComponent
                  key={isPlaying ? 'playing-grid-landscape' : 'spectating-grid-landscape'}
                  grid={letterGrid}
                  interactive={isPlaying && !showStartAnimation}
                  animateOnMount={!hasAnimatedRef.current}
                  onWordSubmit={handleGridWordSubmit}
                  onWordChange={handleWordChange}
                  comboLevel={comboLevel}
                  hideComboIndicator={true}
                  hideWordPreview={true}
                  largeText
                  fireRoundActive={fireRoundActive}
                  earthquakeShaking={earthquakeState === 'shaking'}
                  highlightedPath={shouldShowKeyboardTrails(keyboardInput.isTypingMode, lastWordFoundTime, totalGamesPlayed) ? keyboardInput.highlightedCells : []}
                  onSingleTapDetected={tapDragGuidance.handleSingleTapDetected}
                  language={gameLanguage || 'en'}
                />
              </div>

              {isPlaying && leaderboard.length > 1 && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-auto max-w-[280px]">
                  <CompactLeaderboard
                    players={leaderboard.map((p, index) => ({
                      username: p.username,
                      score: p.score,
                      rank: index + 1,
                      isCurrentUser: p.username === username,
                      profilePictureUrl: p.avatar?.profilePictureUrl,
                      avatarImage: p.avatar?.avatarImage,
                      avatarEmoji: p.avatar?.emoji,
                      avatarColor: p.avatar?.color,
                    }))}
                    currentUsername={username}
                    t={t}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            {/* Right Side Panel */}
            <div className="row-start-1 col-start-3 flex justify-end pe-1">
              {isPlaying && (
                <div className="landscape-panel flex flex-col items-center gap-2">
                  <div className="flex flex-col items-center">
                    <motion.div
                      key={playerData.score}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="landscape-stat-primary text-neo-black"
                    >
                      {playerData.score}
                    </motion.div>
                    <div className="landscape-stat-label text-neo-black flex items-center gap-0.5">
                      {t('common.score') || 'SCORE'}
                      <ScoreBreakdownTooltip t={t} minWordLength={minWordLength} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom action bar */}
            <div
              className="row-start-2 col-span-3 z-30 flex justify-between items-end px-2 pb-2"
              style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  {onExitRoom && (
                    <ExitRoomButton
                      onClick={onExitRoom}
                      label={t('playerView.exit')}
                      className="w-12 h-12"
                    />
                  )}
                  {onShowTutorial && (
                    <motion.button
                      onClick={onShowTutorial}
                      whileTap={{ scale: 0.95 }}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] bg-neo-pink/90 border-2 border-neo-black rounded-full shadow-hard flex items-center justify-center hover:bg-neo-pink transition-colors"
                      aria-label={t('help.viewTutorial') || 'View Tutorial'}
                    >
                      <HelpCircle className="w-5 h-5 text-neo-cream" />
                    </motion.button>
                  )}
                </div>

                {isPlaying && (
                  <div className="w-[100px]">
                    {comboLevel > 0 ? (
                      <ComboDisplay comboLevel={comboLevel} highContrast compact timeRemaining={comboTimeRemaining} isDanger={comboDanger} />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="text-[10px] text-neo-cream/50 text-center leading-tight"
                      >
                        <span className="text-neo-cyan">⚡</span> {t('game.comboHint') || 'Find words fast for combo!'}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {hints && hints.isSinglePlayer && (
                <HintButton
                  hint={hints.hint}
                  hintType={hints.hintType}
                  hintsRemaining={hints.hintsRemaining}
                  wordLength={hints.wordLength}
                  firstLetter={hints.firstLetter}
                  isLoading={hints.isLoading}
                  error={hints.error}
                  isAvailable={hints.isAvailable}
                  isSinglePlayer={hints.isSinglePlayer}
                  gameActive={gameActive}
                  onRequestHint={hints.requestHint}
                  onClearHint={hints.clearHint}
                  t={t}
                />
              )}
            </div>
          </div>
        </div>

        {/* Achievement dock */}
        {children}
      </>
    );
  }

  // ==================== Portrait/Desktop Layout ====================
  return (
    <>
      {/* Earthquake Warning Overlay */}
      <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

      {/* Fire Round Indicator */}
      <FireRoundIndicator
        isActive={fireRoundActive}
        remainingSeconds={fireRoundRemaining}
      />

      {/* Tap-to-drag guidance - shows when player taps single letter without dragging */}
      <TapToDragTooltip
        isVisible={tapDragGuidance.showDragTutorial}
        onDismiss={tapDragGuidance.dismissDragTutorial}
        t={t}
        dir={dir}
        language={gameLanguage || 'en'}
      />

      {/* Keyboard Input Hint - Desktop only (legacy fallback) */}
      {isPlaying && !keyboardHelp.showQuickTip && (
        <KeyboardHintTooltip
          delaySeconds={10}
          desktopOnly={true}
          t={t}
        />
      )}

      {/* Keyboard Quick Tip - Desktop only (immediate hint) */}
      {isPlaying && isDesktop && (
        <KeyboardQuickTip
          isVisible={keyboardHelp.showQuickTip}
          onDismiss={keyboardHelp.dismissQuickTip}
          t={t}
        />
      )}

      {/* Keyboard Mode Indicator - Desktop only */}
      {isPlaying && isDesktop && (
        <KeyboardModeIndicator
          isNavigationMode={false}
          isTypingMode={keyboardInput.isTypingMode}
          t={t}
          position="top-right"
        />
      )}

      {/* Keyboard Shortcuts Overlay - Desktop only */}
      {isDesktop && (
        <KeyboardShortcutsOverlay
          isOpen={keyboardHelp.isHelpOpen}
          onClose={keyboardHelp.closeHelp}
          t={t}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-0 md:gap-2 lg:gap-3 flex-1 w-full max-w-[1920px] mx-auto overflow-hidden transition-all duration-500 ease-in-out h-full">

        {/* Top Bar - Only on mobile, integrated into parent on desktop */}
        {/* Compact header matching SinglePlayerGame layout with py-0.5 */}
        <div className="lg:hidden w-full flex items-center justify-between px-1 py-0.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {onExitRoom && (
              <ExitRoomButton onClick={onExitRoom} label={t('playerView.exit')} className="relative z-50 !min-h-[40px] !border-2" />
            )}
            {onShowTutorial && (
              <motion.button
                onClick={onShowTutorial}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 bg-neo-pink/90 border-2 border-neo-black rounded-full shadow-hard-sm flex items-center justify-center"
                aria-label={t('help.viewTutorial') || 'View Tutorial'}
              >
                <HelpCircle className="w-3.5 h-3.5 text-neo-cream" />
              </motion.button>
            )}
          </div>

          {/* Hint Button - Single Player Mode Only */}
          {hints && hints.isSinglePlayer && (
            <HintButton
              hint={hints.hint}
              hintType={hints.hintType}
              hintsRemaining={hints.hintsRemaining}
              wordLength={hints.wordLength}
              firstLetter={hints.firstLetter}
              isLoading={hints.isLoading}
              error={hints.error}
              isAvailable={hints.isAvailable}
              isSinglePlayer={hints.isSinglePlayer}
              gameActive={gameActive}
              onRequestHint={hints.requestHint}
              onClearHint={hints.clearHint}
              t={t}
            />
          )}
        </div>


        {/* Left Column: Found Words (Desktop only, only when playing, hidden in focus mode) */}
        {isPlaying && !gameplayFocusMode && (
          <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 2xl:w-80 gap-2 min-h-0 flex-shrink-0">
            <div
              className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[75vh] lg:max-h-[80vh] overflow-hidden"
              style={{ transform: 'rotate(1deg)' }}
            >
              {/* Header */}
              <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan text-neo-black">
                <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                  {t('playerView.wordsFound')}
                </h3>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-3 min-h-0 custom-scrollbar">
                <div className="space-y-2">
                  <AnimatePresence>
                    {normalizedFoundWords.map((foundWordObj, index) => {
                      const wordText = foundWordObj.word;
                      const isInvalid = foundWordObj.isValid === false;
                      const isLatest = index === normalizedFoundWords.length - 1;
                      return (
                        <motion.div
                          key={`${wordText}-${foundWordObj.timestamp || index}`}
                          initial={{ x: -30, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -30, opacity: 0 }}
                          className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                          ${isInvalid
                              ? 'bg-neo-red text-neo-cream shadow-hard-sm line-through opacity-70'
                              : isLatest
                                ? 'bg-neo-lime text-neo-black shadow-hard'
                                : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                        >
                          {applyHebrewFinalLetters(wordText).toUpperCase()}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {normalizedFoundWords.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-neo-black/90 text-sm font-bold mb-2">
                        {t('playerView.noWordsYet') || 'No words found yet'}
                      </p>
                      <p className="text-neo-black/60 text-xs px-2">
                        {t('playerView.swipeHintWithMin', { min: minWordLength }) || `Swipe connected letters (${minWordLength}+ letters)`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Center Column: Timer, Score, Grid */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden max-h-full">
          {/* Stats row - Mobile: horizontal layout matching SinglePlayerGame (Combo | Timer | Score) */}
          {remainingTime !== null && (
            <div ref={gameStatsRef} className="flex w-full items-center justify-between px-1 md:px-2 gap-0" role="status" aria-label="Game status">
              {/* Exit + Help + Hint - hidden on mobile (shown in top bar), visible on desktop */}
              <div className="absolute left-2 rtl:left-auto rtl:right-2 md:left-4 md:rtl:right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2 z-30">
                {onExitRoom && (
                  <ExitRoomButton
                    onClick={onExitRoom}
                    label={t('playerView.exit')}
                    className="w-10 h-10 md:w-12 md:h-12"
                  />
                )}
                {onShowTutorial && (
                  <motion.button
                    onClick={onShowTutorial}
                    whileTap={{ scale: 0.95 }}
                    className="w-9 h-9 md:w-10 md:h-10 bg-neo-pink/90 border-2 border-neo-black rounded-full shadow-hard flex items-center justify-center hover:bg-neo-pink transition-colors"
                    aria-label={t('help.viewTutorial') || 'View Tutorial'}
                  >
                    <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-neo-cream" />
                  </motion.button>
                )}
                {hints && hints.isSinglePlayer && (
                  <HintButton
                    hint={hints.hint}
                    hintType={hints.hintType}
                    hintsRemaining={hints.hintsRemaining}
                    wordLength={hints.wordLength}
                    firstLetter={hints.firstLetter}
                    isLoading={hints.isLoading}
                    error={hints.error}
                    isAvailable={hints.isAvailable}
                    isSinglePlayer={hints.isSinglePlayer}
                    gameActive={gameActive}
                    onRequestHint={hints.requestHint}
                    onClearHint={hints.clearHint}
                    t={t}
                  />
                )}
              </div>

              {/* Left Side: Combo - matches SinglePlayerGame horizontal layout */}
              <div className="flex-1 flex justify-end pr-1 md:pr-3 pointer-events-none lg:hidden">
                <div className="pointer-events-auto">
                  {isPlaying && comboLevel > 0 ? (
                    <ComboDisplay comboLevel={comboLevel} compact timeRemaining={comboTimeRemaining} isDanger={comboDanger} />
                  ) : (
                    <div className="min-w-[50px] md:min-w-[90px]" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Timer (center) */}
              <motion.div
                data-tutorial="timer"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-20 shrink-0"
              >
                <div className="hidden lg:block">
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="lg" />
                </div>
                <div className="hidden md:block lg:hidden">
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="md" />
                </div>
                <div className="md:hidden">
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="xs" />
                </div>
              </motion.div>

              {/* Right Side: Score - matches SinglePlayerGame horizontal layout */}
              {isPlaying && (
                <div className="flex-1 flex justify-start pl-1 md:pl-3 pointer-events-none lg:hidden">
                  <div className="pointer-events-auto">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative border-2 md:border-3 border-neo-black rounded-neo shadow-hard md:shadow-hard-lg px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px] md:min-w-[90px] overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
                      }}
                    >
                      <div className="text-center">
                        <motion.div
                          key={playerData.score}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="font-black text-neo-black leading-tight text-lg md:text-2xl"
                          style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
                        >
                          {playerData.score}
                        </motion.div>
                        <div className="font-bold uppercase tracking-wider text-neo-black/80 text-[9px] md:text-xs">
                          {t('common.score') || 'Score'}
                        </div>
                      </div>
                      {/* Rank badge */}
                      {playerData.rank && playerData.rank > 0 && leaderboard.length > 1 && (
                        <div className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-4 h-4 md:w-6 md:h-6 bg-neo-pink text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-[8px] md:text-xs font-black shadow-hard-sm">
                          #{playerData.rank}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Desktop: Combo + Score absolutely positioned on right */}
              {isPlaying && (
                <div className="hidden lg:flex lg:flex-col lg:items-end lg:gap-2 lg:absolute lg:right-4 rtl:lg:right-auto rtl:lg:left-4 lg:top-1/2 lg:-translate-y-1/2 z-30">
                  {/* Combo */}
                  <div className="h-[32px] flex items-center justify-end">
                    {comboLevel > 0 ? (
                      <ComboDisplay comboLevel={comboLevel} compact timeRemaining={comboTimeRemaining} isDanger={comboDanger} />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="text-[10px] text-neo-cream/40 text-right leading-tight max-w-[70px]"
                      >
                        <span className="text-neo-cyan/60">⚡</span> {t('game.comboHint') || 'Find words fast!'}
                      </motion.div>
                    )}
                  </div>
                  {/* Score */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-4 py-1.5 min-w-[90px] overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #BFFF00 0%, #9AFF00 50%, #FFE135 100%)',
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
                    <div className="text-center">
                      <motion.div
                        key={playerData.score}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-black text-neo-black leading-tight"
                        style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
                      >
                        {playerData.score}
                      </motion.div>
                      <div className="text-sm font-bold uppercase tracking-wider text-neo-black flex items-center justify-center gap-0.5">
                        {t('common.score') || 'Score'}
                        <ScoreBreakdownTooltip t={t} minWordLength={minWordLength} />
                      </div>
                    </div>
                    {playerData.rank && playerData.rank > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-6 h-6 bg-neo-pink text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-xs font-black shadow-hard-sm">
                        #{playerData.rank}
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* Word Forming Area with feedback - centered below timer */}
          {/* Shows typed word when in keyboard mode, otherwise shows swiped word */}
          {isPlaying && (
            <div className="flex items-center justify-center flex-shrink-0 mb-0">
              <WordFormingArea
                word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord}
                letterCount={keyboardInput.isTypingMode ? keyboardInput.typedWord.length : letterCount}
                feedback={currentFeedback}
                compact
              />
            </div>
          )}

          {/* Tournament Progress Banner */}
          {tournamentData && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-7xl mx-auto mb-1"
            >
              <Card className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 dark:from-purple-700/90 dark:to-pink-700/90 backdrop-blur-md border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <CardContent className="py-1 px-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                      <div>
                        <div className="text-white font-bold text-xs md:text-sm">
                          {tournamentData.name || t('hostView.tournament')}
                        </div>
                        <div className="text-purple-100 text-[10px] md:text-xs">
                          {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-neo-black border-white/30 text-[10px] md:text-xs">
                      {t('hostView.tournamentProgress')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Grid - Direct connection to timer row, centered like single player */}
          <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
            <GridComponent
              key={isPlaying ? 'playing-grid' : 'spectating-grid'}
              grid={letterGrid}
              interactive={isPlaying && !showStartAnimation}
              animateOnMount={!hasAnimatedRef.current}
              onWordSubmit={handleGridWordSubmit}
              onWordChange={handleWordChange}
              comboLevel={comboLevel}
              hideComboIndicator={true}
              hideWordPreview={true}
              fireRoundActive={fireRoundActive}
              earthquakeShaking={earthquakeState === 'shaking'}
              highlightedPath={shouldShowKeyboardTrails(keyboardInput.isTypingMode, lastWordFoundTime, totalGamesPlayed) ? keyboardInput.highlightedCells : []}
              onSingleTapDetected={tapDragGuidance.handleSingleTapDetected}
              language={gameLanguage || 'en'}
            />
          </div>


          {/* Words Remaining - 5+ letter words only (single-player only) */}
          {hints?.isSinglePlayer && isPlaying && totalBoardWords !== null && totalBoardWords !== undefined && totalBoardWords > 0 && (
            <div className="flex justify-center flex-shrink-0">
              <WordsRemaining
                totalWords={totalBoardWords}
                foundWordsCount={normalizedFoundWords.filter(fw => fw.isValid !== false && fw.word.length >= 5).length}
                t={t}
                minLength={5}
              />
            </div>
          )}

          {/* Mobile: Split-view with compact leaderboard + words (eliminates tab switching) */}
          {/* Now visible on all mobile/tablet screens, hidden on desktop where sidebar is used */}
          {isPlaying && !gameplayFocusMode && leaderboard && leaderboard.length > 0 && (
            <div className="block lg:hidden mt-0.5 md:mt-1 space-y-0.5 max-w-md mx-auto lg:max-w-lg md:space-y-1 flex-shrink-0 overflow-hidden max-h-[120px]">
              {/* Compact Leaderboard - Always visible */}
              <CompactLeaderboard
                players={leaderboard.map(p => ({
                  username: p.username,
                  score: p.score,
                  rank: 0, // Will be calculated in component
                  profilePictureUrl: p.avatar?.profilePictureUrl,
                  avatarEmoji: p.avatar?.emoji,
                  avatarColor: p.avatar?.color,
                }))}
                currentUsername={username}
                t={t}
              />

              {/* Found Words - Compact view, no scroll */}
              <div className="bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard p-1.5 md:p-2">
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <span className="text-[10px] md:text-xs font-black uppercase text-neo-black">
                    {t('hostView.words') || 'Your Words'}
                  </span>
                  <span className="text-xs font-bold text-neo-black/90">
                    {normalizedFoundWords.length}
                  </span>
                </div>
                <div className="max-h-[50px] overflow-hidden">
                  {normalizedFoundWords.length === 0 ? (
                    <p className="text-center text-neo-black/70 py-1 text-[10px]">
                      {t('playerView.swipeHintShort') || 'Swipe letters to find words!'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {normalizedFoundWords.slice().reverse().map((wordObj, index) => (
                        <motion.span
                          key={`${wordObj.word}-${index}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`inline-block px-2 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black ${wordObj.isValid === false
                            ? 'bg-neo-red text-neo-cream line-through opacity-70'
                            : index === 0
                              ? 'bg-neo-lime text-neo-black'
                              : 'bg-white text-neo-black'
                            }`}
                        >
                          {applyHebrewFinalLetters(wordObj.word)}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Achievement dock */}
          {children}
        </div>

        {/* Right Column: Live Leaderboard (hidden in focus mode, desktop only) */}
        {!gameplayFocusMode && (
          <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 2xl:w-80 gap-2 flex-shrink-0">
            <motion.div
              className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[45vh] lg:max-h-none lg:flex-grow relative"
              style={{ transform: 'rotate(-1deg)' }}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Header with gradient accent */}
              <div className="py-3 px-4 border-b-4 border-neo-black bg-gradient-to-r from-neo-pink via-neo-pink to-neo-pink-dark text-white relative overflow-hidden">
                {/* Animated sparkle effect */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-1 right-8 w-2 h-2 bg-white rounded-full animate-twinkle" />
                  <div className="absolute top-3 right-4 w-1 h-1 bg-white rounded-full animate-twinkle delay-500" />
                </div>
                <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black relative z-10">
                  <Trophy className="w-5 h-5 text-neo-lime animate-bounce" style={{ filter: 'drop-shadow(2px 2px 0px rgb(var(--neo-black)))', animationDuration: '2s' }} />
                  {t('playerView.leaderboard')}
                </h3>
              </div>
              {/* Content */}
              <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                <div className="space-y-2">
                  {memoizedLeaderboard.map((player, index) => (
                    <motion.div
                      key={player.username}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                      className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                    hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                    ${player.rankStyle} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Rank badge */}
                      <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                        {player.rankDisplay}
                      </div>
                      {/* Avatar */}
                      <Avatar
                        profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                        avatarImage={player.avatar?.avatarImage}
                        size="xl"
                      />
                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-black truncate text-sm flex items-center gap-1 text-neo-black ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          {player.isHost && <Crown className="w-4 h-4 text-neo-lime flex-shrink-0" style={{ filter: 'drop-shadow(1px 1px 0px rgb(var(--neo-black)))' }} />}
                          <span className="truncate" title={player.username}>{player.username}</span>
                          {player.isMe && (
                            <span className="text-xs bg-neo-black text-neo-cream px-1.5 py-0.5 rounded-neo font-bold flex-shrink-0">
                              {t('playerView.me') || 'YOU'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-neo-black/90">
                          {player.wordCount || 0} {t('hostView.words') || 'words'}
                        </div>
                      </div>
                      {/* Presence and Score */}
                      <div className="flex items-center gap-2">
                        {/* Presence indicator (only show for others when host) */}
                        {isHost && !player.isMe && player.presenceStatus && (
                          <PresenceIndicator
                            status={player.presenceStatus}
                            isWindowFocused={player.isWindowFocused}
                            size="lg"
                          />
                        )}
                        <div className="text-right">
                          <div className="text-lg font-black text-neo-black leading-none">
                            {player.score}
                          </div>
                          <div className="text-xs font-bold text-neo-black/90 uppercase">pts</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {leaderboard.length === 0 && (
                    <p className="text-center text-neo-black/90 py-6 text-sm font-bold">
                      {t('hostView.waitingForPlayers') || 'Waiting for players...'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Chat Component - Desktop only */}
            <motion.div
              className="hidden lg:block"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <RoomChat
                username={isHost ? "Host" : username}
                isHost={isHost}
                gameCode={gameCode}
                className="max-h-[200px]"
              />
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
});

InGameScreen.displayName = 'InGameScreen';

export default InGameScreen;
