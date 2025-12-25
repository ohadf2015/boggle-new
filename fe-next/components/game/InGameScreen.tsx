'use client';

import React, { ReactNode, useRef, useEffect, useCallback, useMemo, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaCrown } from 'react-icons/fa';
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
import { HelpPanel, HelpButton } from './HelpPanel';
import WordFormingArea, { type WordFeedback } from './WordFormingArea';
import ComboDisplay from './ComboDisplay';
import ThemeIndicator from './ThemeIndicator';
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

  // Player data
  foundWords?: FoundWord[] | string[];
  leaderboard?: LeaderboardPlayer[];

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

  // Player data
  foundWords = [],
  leaderboard = [],

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
}) => {
  const {
    playWordAcceptedSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  } = useSoundEffects();
  const { announceWordResult } = useAnnouncer();
  const isLandscape = useMobileLandscape();

  // Help panel state for discoverability
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // Word forming state (for external WordFormingArea)
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);

  // Feedback state (for WordFormingArea)
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);

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

    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordTooShort', handleWordTooShort);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
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

  // Normalize found words to FoundWord format
  const normalizedFoundWords: FoundWord[] = useMemo(() => {
    return foundWords.map(w =>
      typeof w === 'string' ? { word: w, isValid: true } : w
    );
  }, [foundWords]);

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
  ]); // Optimized: removed effectiveComboLevelRef and fireRoundActive from deps (using refs)

  // Memoize leaderboard items with centralized ranking utilities
  const memoizedLeaderboard = useMemo(() => leaderboard.map((player, index) => ({
    ...player,
    rankStyle: getRankStyle(index),
    isMe: player.username === username,
    rankDisplay: getRankIconString(index)
  })), [leaderboard, username]);

  // Handle word forming changes from GridComponent
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Check for very short landscape screens to prevent panel overlap
  const isVeryShortLandscape = isLandscape && viewportHeight > 0 && viewportHeight < 350;

  // ==================== Landscape Layout ====================
  // In landscape mobile mode, use a maximized grid layout with stats on sides
  if (isLandscape) {
    return (
      <>
        <HelpPanel isOpen={showHelpPanel} onClose={() => setShowHelpPanel(false)} />

        {/* Earthquake Warning Overlay */}
        <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

        {/* Fire Round Indicator */}
        <FireRoundIndicator
          isActive={fireRoundActive}
          remainingSeconds={fireRoundRemaining}
        />

        {/* Full-screen landscape container with grid centered - uses full viewport */}
        <div className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-slate-900 landscape-full-height">

          {/* Left Side Stats - Consolidated Panel (Timer + Stats) - ENLARGED FOR LANDSCAPE */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-40 landscape-side-panel">
            <div className="bg-neo-cream/95 border-4 border-neo-black rounded-neo shadow-hard-lg p-3 flex flex-col items-center gap-3">
              {/* Timer - Larger for better visibility */}
              {remainingTime !== null && (
                <CircularTimer
                  remainingTime={remainingTime}
                  totalTime={timerValue * 60}
                  size="md"
                />
              )}

              {/* Stats Row - Rank & Words side by side when both exist - ENLARGED */}
              {isPlaying && (
                <div className="flex items-center gap-2">
                  {/* Rank Badge (if in multiplayer) - LARGER */}
                  {playerData.rank && playerData.rank > 0 && leaderboard.length > 1 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-neo-purple text-neo-cream border-3 border-neo-black rounded-neo shadow-hard px-3 py-2 text-center min-w-[56px]"
                    >
                      <div className="text-lg font-black leading-tight">
                        #{playerData.rank}
                      </div>
                    </motion.div>
                  )}

                  {/* Words count - LARGER */}
                  <div className="bg-neo-navy text-neo-cream border-3 border-neo-black rounded-neo shadow-hard px-3 py-2 text-center min-w-[56px]">
                    <div className="text-lg font-black leading-tight">
                      {normalizedFoundWords.length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side Stats - Consolidated Score Panel - ENLARGED FOR LANDSCAPE */}
          {isPlaying && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-40 landscape-side-panel">
              <motion.div
                initial={{ scale: 0, rotate: -2 }}
                animate={{ scale: 1, rotate: 1 }}
                className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg p-3 flex flex-col items-center gap-2"
              >
                {/* Score - MUCH LARGER */}
                <motion.div
                  key={playerData.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-black text-neo-black leading-none"
                >
                  {playerData.score}
                </motion.div>

                {/* Enhanced Combo Display */}
                <ComboDisplay comboLevel={comboLevel} />
              </motion.div>
            </div>
          )}


          {/* Bottom-right: Help button (offset to avoid hint button) */}
          <div className="absolute bottom-2 right-16 z-30">
            <HelpButton
              onClick={() => setShowHelpPanel(true)}
              className="w-11 h-11"
            />
          </div>

          {/* Bottom-left: Exit button */}
          {onExitRoom && (
            <div className="absolute bottom-2 left-2 z-30">
              <ExitRoomButton
                onClick={onExitRoom}
                label={t('playerView.exit')}
                className="w-12 h-12"
              />
            </div>
          )}

          {/* Bottom-right: Hint Button - Single Player Mode Only */}
          {hints && hints.isSinglePlayer && (
            <div className="absolute bottom-2 right-2 z-30">
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
            </div>
          )}

          {/* Center: Word Forming Area + Notification + Grid */}
          <div className={`flex flex-col items-center justify-center w-full h-full ${isVeryShortLandscape ? 'px-4' : 'px-3'} py-0.5 landscape-grid-container`}>
            {/* Word Forming Area with integrated feedback - flex-shrink-0 prevents squishing, z-50 keeps it visible */}
            {isPlaying && (
              <WordFormingArea
                word={formedWord}
                letterCount={letterCount}
                feedback={currentFeedback}
                compact
                className="mb-1 flex-shrink-0 z-50"
              />
            )}
            <div className="flex-1 flex items-center justify-center game-board-frame-landscape" style={{ aspectRatio: '1/1' }}>
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
              />
            </div>
          </div>

          {/* Theme Indicator - subtle, bottom center in landscape */}
          {boardTheme && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 opacity-60">
              <ThemeIndicator theme={boardTheme} />
            </div>
          )}
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

      <div className="flex flex-col lg:flex-row gap-1 md:gap-2 flex-grow w-full overflow-hidden transition-all duration-500 ease-in-out">

      {/* Top Bar - Only on mobile, integrated into parent on desktop */}
      <div className="lg:hidden w-full flex items-center justify-between mb-1 px-2">
        {onExitRoom && (
          <ExitRoomButton onClick={onExitRoom} label={t('playerView.exit')} className="relative z-50" />
        )}

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

      {/* Help Button - Fixed at bottom right on mobile */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <HelpButton onClick={() => setShowHelpPanel(true)} />
      </div>

      {/* Help Panel - Accessible from anywhere */}
      <HelpPanel isOpen={showHelpPanel} onClose={() => setShowHelpPanel(false)} />

      {/* Left Column: Found Words (Desktop only, only when playing, hidden in focus mode) */}
      {isPlaying && !gameplayFocusMode && (
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[65vh] lg:max-h-[70vh] overflow-hidden"
            style={{ transform: 'rotate(1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
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
                              ? 'bg-neo-yellow text-neo-black shadow-hard'
                              : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                      >
                        {applyHebrewFinalLetters(wordText).toUpperCase()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {normalizedFoundWords.length === 0 && (
                  <p className="text-center text-neo-black/80 py-6 text-sm font-bold">
                    {t('playerView.noWordsYet') || 'No words found yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center Column: Timer, Score, Grid */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Stats row - Combo | Timer | Score - timer always centered and visible */}
        {remainingTime !== null && (
          <div ref={gameStatsRef} className="flex items-center justify-center gap-3 md:gap-4 mb-2" role="status" aria-label="Game status">
            {/* Combo (left - shows when level >= 2, placeholder otherwise for layout balance) */}
            {isPlaying && (
              <div className="min-w-[70px] md:min-w-[90px] flex justify-end">
                <ComboDisplay comboLevel={comboLevel} compact />
              </div>
            )}

            {/* Timer (center - always visible and prominent) */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-20"
            >
              <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="md" />
            </motion.div>

            {/* Score (right position) - vibrant yellow/lime gradient */}
            {isPlaying && (
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
                    key={playerData.score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-xl md:text-2xl font-black text-neo-black leading-tight"
                    style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
                  >
                    {playerData.score}
                  </motion.div>
                  <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-neo-black/80">
                    {t('common.score') || 'Score'}
                  </div>
                </div>
                {/* Rank badge */}
                {playerData.rank && playerData.rank > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-neo-purple text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-xs font-black shadow-hard-sm">
                    #{playerData.rank}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Word Forming Area with feedback - centered below timer */}
        {isPlaying && (
          <div className="flex items-center justify-center mb-1">
            <WordFormingArea
              word={formedWord}
              letterCount={letterCount}
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
                    <FaTrophy className="text-yellow-300 text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    <div>
                      <div className="text-white font-bold text-xs md:text-sm">
                        {tournamentData.name || t('hostView.tournament')}
                      </div>
                      <div className="text-purple-100 text-[10px] md:text-xs">
                        {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 text-[10px] md:text-xs">
                    {t('hostView.tournamentProgress')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Grid - Direct connection to timer row */}
        <div className="flex justify-center">
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
            />
        </div>

        {/* Theme Indicator - subtle, below grid */}
        {boardTheme && (
          <div className="flex justify-center mt-1 opacity-70">
            <ThemeIndicator theme={boardTheme} />
          </div>
        )}

        {/* Mobile: Word count display (when playing) */}
        {isPlaying && (
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {normalizedFoundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Achievement dock */}
        {children}
      </div>

      {/* Right Column: Live Leaderboard (hidden in focus mode) */}
      {!gameplayFocusMode && (
      <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
        <div
          className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[45vh] lg:max-h-none lg:flex-grow"
          style={{ transform: 'rotate(-1deg)' }}
        >
          {/* Header */}
          <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
            <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
              <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px rgb(var(--neo-black)))' }} />
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
                    avatarEmoji={player.avatar?.emoji}
                    avatarImage={player.avatar?.avatarImage}
                    avatarColor={player.avatar?.color}
                    size="xl"
                  />
                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-black truncate text-sm flex items-center gap-1 text-neo-black ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      {player.isHost && <FaCrown className="text-neo-yellow flex-shrink-0" style={{ filter: 'drop-shadow(1px 1px 0px rgb(var(--neo-black)))' }} />}
                      <span className="truncate">{player.username}</span>
                      {player.isMe && (
                        <span className="text-xs bg-neo-black text-neo-cream px-1.5 py-0.5 rounded-neo font-bold flex-shrink-0">
                          {t('playerView.me') || 'YOU'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-neo-black/70">
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
                      <div className="text-xs font-bold text-neo-black/75 uppercase">pts</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-center text-neo-black/75 py-6 text-sm font-bold">
                  {t('hostView.waitingForPlayers') || 'Waiting for players...'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Component - Desktop only */}
        <div className="hidden lg:block">
          <RoomChat
            username={isHost ? "Host" : username}
            isHost={isHost}
            gameCode={gameCode}
            className="max-h-[200px]"
          />
        </div>
      </div>
      )}
    </div>
    </>
  );
});

InGameScreen.displayName = 'InGameScreen';

export default InGameScreen;
