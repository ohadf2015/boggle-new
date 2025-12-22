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
import LandscapeIndicator from '../LandscapeIndicator';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { wordErrorToast } from '../NeoToast';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useAnnouncer } from '../GameAnnouncer';
import { validateWordLocally, couldBeOnBoard } from '../../utils/clientWordValidator';
import { hapticForWordScore, hapticError } from '../../utils/haptics';
import type { LetterGrid, Language } from '@/shared/types/game';
import type {
  FoundWord,
  ExtendedLeaderboardPlayer as LeaderboardPlayer,
  TournamentData,
} from '@/shared/types/view';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useAutoHideControls } from '@/hooks/useAutoHideControls';

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

  // Achievement dock (rendered outside this component)
  children?: ReactNode;
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

  // Achievement dock
  children,
}) => {
  const { playWordAcceptedSound } = useSoundEffects();
  const { announceWordResult } = useAnnouncer();
  const isLandscape = useMobileLandscape();

  // Help panel state for discoverability
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // Viewport height detection for very short landscape screens
  const [viewportHeight, setViewportHeight] = useState(0);

  // Auto-hide controls for landscape mode - REDUCED hide delay for faster auto-hide
  const { isVisible: controlsVisible, isPinned: controlsPinned, show: showControls, togglePin: toggleControlsPin } = useAutoHideControls({
    hideDelay: 1500, // Reduced from 3000ms to 1500ms for faster auto-hide
    initialHidden: true,
    enabled: isLandscape,
  });

  // Show controls on scroll/touch/mousemove in landscape mode
  // BUT NOT when interacting with the game board or side panels
  useEffect(() => {
    if (!isLandscape) return;

    const handleInteraction = (e: Event) => {
      // Don't show controls if interacting with the grid/board or side stat panels
      const target = e.target;
      if (!(target instanceof Element)) return;

      if (target.closest('.landscape-grid-container') ||
          target.closest('.game-board-frame-landscape') ||
          target.closest('.landscape-side-panel')) {
        return;
      }
      showControls();
    };

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('touchmove', handleInteraction, { passive: true });
    window.addEventListener('mousemove', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, [isLandscape, showControls]);

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

  // Track if grid animation has already played
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

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
      if (validation.errorKey === 'playerView.wordTooShortMin') {
        msg = t('playerView.wordTooShortMin')
          ? t('playerView.wordTooShortMin').replace('${min}', String(validation.errorParams?.min || minWordLength))
          : `Word too short! (min ${validation.errorParams?.min || minWordLength} letters)`;
      } else if (validation.errorKey === 'playerView.wordTooShort') {
        msg = t('playerView.wordTooShort') || 'Word too short';
      } else {
        const errorKey = validation.errorKey ?? 'Invalid word';
        msg = t(errorKey) || errorKey;
      }
      wordErrorToast(msg, { duration: 1000 });
      // Haptic feedback for error
      hapticError();
      // Announce rejection for screen readers
      announceWordResult(formedWord, false, undefined, msg);
      // Reset combo if duplicate word
      if (validation.errorKey === 'playerView.wordAlreadyFound' && onResetCombo) {
        onResetCombo();
      }
      return;
    }

    // Check if word can be on board
    if (!couldBeOnBoard(formedWord, letterGrid, currentLang)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard');
      wordErrorToast(notOnBoardMsg, { duration: 1500 });
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
    });

    // Add to local found words
    onWordSubmit?.(formedWord);
  }, [isPlaying, gameLanguage, minWordLength, normalizedFoundWords, letterGrid, gameActive, socket, effectiveComboLevelRef, onWordSubmit, onResetCombo, t, playWordAcceptedSound]);

  // Get rank style for leaderboard
  const getRankStyle = useCallback((index: number): string => {
    if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
    if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
    if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
    return 'bg-neo-cream text-neo-black border-neo-black';
  }, []);

  // Memoize leaderboard items
  const memoizedLeaderboard = useMemo(() => leaderboard.map((player, index) => ({
    ...player,
    rankStyle: getRankStyle(index),
    isMe: player.username === username,
    rankDisplay: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
  })), [leaderboard, username, getRankStyle]);

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

                {/* Combo indicator (inline when active) - LARGER */}
                <AnimatePresence>
                  {comboLevel > 1 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="bg-neo-cyan border-3 border-neo-black rounded-neo px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <span className="text-base font-black text-neo-black">🔥</span>
                      <motion.span
                        key={comboLevel}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="text-lg font-black text-neo-black"
                      >
                        x{comboLevel}
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* Hidden Controls Indicator - Shows when controls are auto-hidden - ENLARGED */}
          <AnimatePresence>
            {!(controlsVisible || controlsPinned) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  showControls();
                }}
                className="absolute top-3 right-3 z-40 flex items-center gap-2 px-4 py-3 bg-neo-navy border-3 border-neo-cream rounded-neo shadow-hard cursor-pointer hover:bg-neo-purple active:shadow-hard-sm transition-all min-h-[56px] min-w-[56px]"
                aria-label={t('common.showControls') || 'Tap to show controls'}
              >
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-3 h-3 rounded-full bg-neo-cyan"
                />
                <span className="text-sm font-bold text-neo-cream uppercase tracking-wide">
                  {t('common.menu') || 'Menu'}
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Top Controls - Exit + Help - AUTO-HIDE with ENLARGED BUTTONS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: controlsVisible || controlsPinned ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-0 left-0 right-0 z-30 flex justify-between items-start p-3 ${
              controlsVisible || controlsPinned ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            {/* Exit Button - left - LARGER (56px for better touch target) */}
            {onExitRoom && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onExitRoom();
                }}
                className="w-14 h-14 bg-neo-red border-3 border-neo-black rounded-neo text-neo-cream text-xl font-bold shadow-hard flex items-center justify-center hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm transition-all"
                aria-label={t('playerView.exit') || 'Exit'}
              >
                ✕
              </button>
            )}

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Help Button - LARGER (56px for better touch target) */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHelpPanel(true);
                }}
                className="w-14 h-14 bg-neo-purple border-3 border-neo-black rounded-neo text-neo-cream text-xl font-bold shadow-hard flex items-center justify-center hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm transition-all"
                aria-label={t('help.title') || 'Help'}
              >
                ?
              </button>
            </div>
          </motion.div>

          {/* Hint Button - Single Player Mode Only (auto-hide with controls, faster fade) */}
          {hints && hints.isSinglePlayer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: controlsVisible || controlsPinned ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute bottom-3 right-3 z-30 ${
                controlsVisible || controlsPinned ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
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
            </motion.div>
          )}

          {/* Center: Grid (takes full height in landscape - properly sized for mobile) */}
          <div className={`flex items-center justify-center w-full h-full ${isVeryShortLandscape ? 'px-4' : 'px-3'} py-0.5 landscape-grid-container`}>
            <div className="h-full flex items-center justify-center game-board-frame-landscape" style={{ aspectRatio: '1/1' }}>
              <GridComponent
                key={isPlaying ? 'playing-grid-landscape' : 'spectating-grid-landscape'}
                grid={letterGrid}
                interactive={isPlaying && !showStartAnimation}
                animateOnMount={!hasAnimatedRef.current}
                onWordSubmit={handleGridWordSubmit}
                comboLevel={comboLevel}
                largeText
                fireRoundActive={fireRoundActive}
                earthquakeShaking={earthquakeState === 'shaking'}
              />
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
      {/* Landscape mode suggestion banner for mobile portrait users */}
      <LandscapeIndicator />

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

        {/* Help Button - For discoverability (both single and multiplayer) */}
        <HelpButton onClick={() => setShowHelpPanel(true)} className="ml-auto" />
      </div>

      {/* Help Panel - Accessible from anywhere */}
      <HelpPanel isOpen={showHelpPanel} onClose={() => setShowHelpPanel(false)} />

      {/* Left Column: Found Words (Desktop only, only when playing) */}
      {isPlaying && (
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[60vh] overflow-hidden"
            style={{ transform: 'rotate(1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
              <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                {t('playerView.wordsFound')}
              </h3>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
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
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
        {/* Timer with Score and Combo flanking it (when playing) */}
        {remainingTime !== null && (
          <div className="flex items-center justify-center gap-3 md:gap-6 mb-2">
            {/* Score - Neo-Brutalist card (only when playing) */}
            {isPlaying && (
              <motion.div
                initial={{ scale: 0, rotate: -5 }}
                animate={{ scale: 1, rotate: -2 }}
                className="relative bg-neo-yellow border-4 border-neo-black rounded-neo-lg shadow-hard px-3 md:px-5 py-2 min-w-[70px] md:min-w-[90px]"
              >
                <div className="text-center" style={{ transform: 'rotate(2deg)' }}>
                  <motion.div
                    key={playerData.score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-xl md:text-2xl font-black text-neo-black"
                    style={{ textShadow: '2px 2px 0px var(--neo-cream)' }}
                  >
                    {playerData.score}
                  </motion.div>
                  <div className="text-xs md:text-sm font-bold uppercase tracking-wider text-neo-black">
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

            {/* Timer */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10"
            >
              <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
            </motion.div>

            {/* Combo - Neo-Brutalist card (only when playing and combo > 1) */}
            {isPlaying && (
              <div className="min-w-[70px] md:min-w-[90px]">
                <AnimatePresence>
                  {comboLevel > 1 && (
                    <motion.div
                      initial={{ scale: 0, rotate: 5, opacity: 0 }}
                      animate={{ scale: 1, rotate: 2, opacity: 1 }}
                      exit={{ scale: 0, rotate: 10, opacity: 0 }}
                      className="relative bg-neo-cyan border-4 border-neo-black rounded-neo-lg shadow-hard px-3 md:px-5 py-2"
                    >
                      <div className="text-center" style={{ transform: 'rotate(-2deg)' }}>
                        <motion.div
                          key={comboLevel}
                          initial={{ scale: 1.5 }}
                          animate={{ scale: 1 }}
                          className="text-xl md:text-2xl font-black text-neo-black"
                          style={{ textShadow: '2px 2px 0px var(--neo-cream)' }}
                        >
                          x{comboLevel}
                        </motion.div>
                        <div className="text-xs md:text-sm font-bold uppercase tracking-wider text-neo-black">
                          {t('common.combo') || 'Combo'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Placeholder when no combo to maintain layout */}
                {comboLevel <= 1 && <div className="invisible px-3 md:px-5 py-2" />}
              </div>
            )}
          </div>
        )}

        {/* Tournament Progress Banner */}
        {tournamentData && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-7xl mx-auto mb-2"
          >
            <Card className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 dark:from-purple-700/90 dark:to-pink-700/90 backdrop-blur-md border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <CardContent className="py-2 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FaTrophy className="text-yellow-300 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    <div>
                      <div className="text-white font-bold text-sm md:text-base">
                        {tournamentData.name || t('hostView.tournament')}
                      </div>
                      <div className="text-purple-100 text-xs md:text-sm">
                        {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                    {t('hostView.tournamentProgress')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Grid */}
        <Card className="bg-slate-900 dark:bg-slate-900 backdrop-blur-md border-0 md:border border-cyan-500/40 shadow-none md:shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
          <CardContent className="flex-grow flex flex-col items-center justify-center p-1 md:p-2 bg-slate-900">
            <GridComponent
              key={isPlaying ? 'playing-grid' : 'spectating-grid'}
              grid={letterGrid}
              interactive={isPlaying && !showStartAnimation}
              animateOnMount={!hasAnimatedRef.current}
              onWordSubmit={handleGridWordSubmit}
              comboLevel={comboLevel}
              fireRoundActive={fireRoundActive}
              earthquakeShaking={earthquakeState === 'shaking'}
            />
          </CardContent>
        </Card>

        {/* Mobile: Word count display (when playing) */}
        {isPlaying && (
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {normalizedFoundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Achievement dock */}
        {children}
      </div>

      {/* Right Column: Live Leaderboard */}
      <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
        <div
          className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow"
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
          <div className="overflow-y-auto flex-1 p-3">
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
                    avatarColor={player.avatar?.color}
                    size="sm"
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
                      <div className="text-xs font-bold text-neo-black/60 uppercase">pts</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
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
    </div>
    </>
  );
});

InGameScreen.displayName = 'InGameScreen';

export default InGameScreen;
