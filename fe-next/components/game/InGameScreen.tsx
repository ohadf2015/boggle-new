'use client';

import React, { useRef, useEffect, useCallback, useMemo, memo, useState, useDeferredValue } from 'react';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useAnnouncer } from '../GameAnnouncer';
import { useAutoScrollOnGameStart } from '@/hooks/useAutoScrollOnGameStart';
import { useTapToDragGuidance } from '@/hooks/useTapToDragGuidance';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useKeyboardHelpState } from '@/hooks/useKeyboardHelpState';
import { useLeadChangeDetection } from '@/hooks/useLeadChangeDetection';
import type { WordFeedback } from './WordFormingArea';
import type { FoundWord } from '@/shared/types/view';
import { detectSpecialCombos } from '@/components/blast/utils/blastCombos';
import type { BlastTileState } from '@/components/blast/types';
import type { SelectedCell } from '@/components/grid';

// Extracted hooks
import {
  useWordSubmission,
  useEarthquakeEffects,
  useSocketFeedback,
} from './in-game/hooks';

// Extracted sub-components
import { PortraitLayout } from './in-game/components';

// Types
import type { InGameScreenProps, EarthquakeState } from './in-game/types';

// Re-export types for backward compatibility
export type { HintsState, InGameScreenProps } from './in-game/types';

/**
 * InGameScreen - Unified in-game screen component for both Host and Player views
 * Shows active game state with grid, timer, found words, and leaderboard
 * Ensures consistent UI between host and player during gameplay
 */
const InGameScreen = memo<InGameScreenProps>(function InGameScreen({
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
  timerValue = 2,
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
  earthquakeState = 'idle' as EarthquakeState,
  fireRoundActive = false,
  fireRoundRemaining = 0,

  // Focus mode
  gameplayFocusMode = false,

  // Achievement dock
  children,

  // Player experience
  totalGamesPlayed,

  // Tutorial callback
  onShowTutorial,

  // Game mode overlays
  gameMode,
  blastTileOverlay,
  wordHuntTargetLength,
  wordHuntAttempts,
  wordHuntFound,
  wordHuntLife,
  wordHuntPlayerLives,
  wordHuntEliminatedPlayers,
  onWordHuntGuess,
}) {
  // Sound effects
  const {
    playWordAcceptedSound,
    playWordRejectedSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
    playComboMilestoneSound,
    playComboBreakSound,
    playRoundStartSound,
    playTimesUpSound,
    setGameActive: setSoundGameActive,
  } = useSoundEffects();

  const { announceWordResult, announceTimer } = useAnnouncer();
  // Enable sound effects when in-game
  useEffect(() => {
    setSoundGameActive(true);
    return () => setSoundGameActive(false);
  }, [setSoundGameActive]);

  // Announce timer at key intervals for screen reader users
  useEffect(() => {
    if (remainingTime !== null && gameActive) {
      announceTimer(remainingTime);
    }
  }, [remainingTime, gameActive, announceTimer]);

  // Play round start sound when game becomes active
  const hasFiredRoundStartRef = useRef(false);
  useEffect(() => {
    if (gameActive && !showStartAnimation && !hasFiredRoundStartRef.current) {
      hasFiredRoundStartRef.current = true;
      playRoundStartSound();
    }
    if (!gameActive) {
      hasFiredRoundStartRef.current = false;
    }
  }, [gameActive, showStartAnimation, playRoundStartSound]);

  // Play times-up sound when timer hits zero
  const hasFiredTimesUpRef = useRef(false);
  useEffect(() => {
    if (remainingTime === 0 && gameActive === false && !hasFiredTimesUpRef.current) {
      hasFiredTimesUpRef.current = true;
      playTimesUpSound();
    }
    if (gameActive) {
      hasFiredTimesUpRef.current = false;
    }
  }, [remainingTime, gameActive, playTimesUpSound]);

  // CrazyGames SDK lifecycle
  const isGameOver = remainingTime === 0;
  useCrazyGamesLifecycle({
    isGameActive: gameActive && !isGameOver,
    isGameOver,
    maxCombo: comboLevel,
    wordsFound: foundWords.length,
  });

  // State
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);
  const [lastWordFoundTime, setLastWordFoundTime] = useState<number>(() => (gameActive ? Date.now() : 0));

  // Deferred values for smoother UI
  const deferredLeaderboard = useDeferredValue(leaderboard);
  const deferredFoundWords = useDeferredValue(foundWords);

  // Refs
  const gameStatsRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  // Create internal combo level ref if not provided
  const internalComboLevelRef = useRef(comboLevel);
  useEffect(() => {
    internalComboLevelRef.current = comboLevel;
  }, [comboLevel]);
  const effectiveComboLevelRef = comboLevelRef || internalComboLevelRef;

  // Mark animation as complete
  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  // Clear stale feedback and formed word when grid changes (new round)
  useEffect(() => {
    setCurrentFeedback(null);
    setFormedWord('');
    setLetterCount(0);
  }, [letterGrid]);

  // Reset lastWordFoundTime when game starts
  useEffect(() => {
    if (gameActive) {
      setLastWordFoundTime(Date.now());
    }
  }, [gameActive]);

  // Auto-scroll to game area on game start
  useAutoScrollOnGameStart(gameStatsRef, {
    gameActive,
    isLandscape: false,
    showStartAnimation,
  });

  // Tap-to-drag guidance
  const tapDragGuidance = useTapToDragGuidance();

  // Earthquake/fire round effects
  useEarthquakeEffects({
    earthquakeState,
    fireRoundActive,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  });

  // Normalize found words to FoundWord format
  const normalizedFoundWords: FoundWord[] = useMemo(
    () => deferredFoundWords.map((w) => (typeof w === 'string' ? { word: w, isValid: true } : w)),
    [deferredFoundWords]
  );

  // Calculate player's score and rank (deferred to avoid double-render on leaderboard updates)
  const playerData = useMemo(() => {
    const playerEntry = deferredLeaderboard.find((p) => p.username === username);
    const playerRank = deferredLeaderboard.findIndex((p) => p.username === username) + 1;
    return {
      score: playerEntry?.score ?? 0,
      rank: playerRank > 0 ? playerRank : null,
    };
  }, [deferredLeaderboard, username]);

  // Lead change detection
  const leadChangeEvent = useLeadChangeDetection(leaderboard, username);

  // Play sound on lead change
  useEffect(() => {
    if (!leadChangeEvent) return;
    if (leadChangeEvent.type === 'took-lead') {
      playComboMilestoneSound(5);
    } else {
      playComboBreakSound(1);
    }
  }, [leadChangeEvent, playComboMilestoneSound, playComboBreakSound]);

  // Ref to hold detected combo type from path (blast multiplayer)
  const comboTypeRef = useRef<string | null>(null);

  // Detect combo type from selected cells path in blast multiplayer
  const handlePathSubmit = useCallback((cells: SelectedCell[]) => {
    if (gameMode !== 'blast' || !blastTileOverlay || blastTileOverlay.length === 0) {
      comboTypeRef.current = null;
      return;
    }
    // Build a minimal tileStates lookup from blastTileOverlay
    // detectSpecialCombos accesses tileStates[row][col].type and .isCleared
    const maxRow = Math.max(...blastTileOverlay.map(t => t.row), 0) + 1;
    const maxCol = Math.max(...blastTileOverlay.map(t => t.col), 0) + 1;
    const tileStates: BlastTileState[][] = Array.from({ length: maxRow }, () =>
      Array.from({ length: maxCol }, () => ({ type: 'standard' as const, isCleared: false } as unknown as BlastTileState))
    );
    for (const tile of blastTileOverlay) {
      tileStates[tile.row][tile.col] = { type: tile.type, isCleared: false } as unknown as BlastTileState;
    }
    const path = cells.map(c => ({ row: c.row, col: c.col }));
    const combos = detectSpecialCombos(path, tileStates);
    comboTypeRef.current = combos.length > 0 ? combos[0].type : null;
  }, [gameMode, blastTileOverlay]);

  // Word submission hook
  const { handleGridWordSubmit, fireRoundActiveRef } = useWordSubmission({
    isPlaying,
    gameActive,
    gameLanguage,
    minWordLength,
    normalizedFoundWords,
    letterGrid,
    socket,
    comboLevelRef: effectiveComboLevelRef,
    t,
    playWordAcceptedSound,
    playWordRejectedSound,
    announceWordResult,
    onWordSubmit,
    onResetCombo,
    setCurrentFeedback,
    setLastWordFoundTime,
    comboTypeRef,
  });

  // Update fireRoundActiveRef when fireRoundActive changes
  useEffect(() => {
    fireRoundActiveRef.current = fireRoundActive;
  }, [fireRoundActive, fireRoundActiveRef]);

  // Socket feedback hook
  useSocketFeedback({
    socket,
    isPlaying,
    t,
    setCurrentFeedback,
    setLastWordFoundTime,
  });

  // Keyboard word input
  const keyboardInput = useKeyboardWordInput({
    grid: letterGrid,
    language: gameLanguage || 'en',
    gameLanguage: gameLanguage,
    enabled: isPlaying && gameActive && !showStartAnimation,
    onWordSubmit: handleGridWordSubmit,
    minWordLength,
  });

  // Desktop detection via pointer capability (no UA sniffing)
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: fine)').matches;
  }, []);

  // Keyboard help state
  const keyboardHelp = useKeyboardHelpState({
    enabled: isDesktop && isPlaying,
    enableQuickTip: isDesktop,
  });

  // Word change handler
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
  }, []);

  // Shared props for layout components
  const sharedLayoutProps = {
    username,
    isPlaying,
    t,
    dir,
    letterGrid,
    remainingTime,
    timerValue,
    gameActive,
    showStartAnimation,
    gameLanguage: gameLanguage || 'en',
    comboLevel,
    comboTimeRemaining,
    comboDanger,
    fireRoundActive,
    hasAnimated: hasAnimatedRef.current,
    earthquakeState,
    playerScore: playerData.score,
    playerRank: playerData.rank,
    leaderboard,
    formedWord,
    letterCount,
    currentFeedback,
    isTypingMode: keyboardInput.isTypingMode,
    typedWord: keyboardInput.typedWord,
    highlightedCells: keyboardInput.highlightedCells,
    lastWordFoundTime,
    totalGamesPlayed,
    onExitRoom,
    onShowTutorial,
    onWordSubmit: handleGridWordSubmit,
    onPathSubmit: handlePathSubmit,
    onWordChange: handleWordChange,
    onSingleTapDetected: tapDragGuidance.handleSingleTapDetected,
    hints,
    fireRoundRemaining,
    showDragTutorial: tapDragGuidance.showDragTutorial,
    onDismissDragTutorial: tapDragGuidance.dismissDragTutorial,
    isDesktop,
    showQuickTip: keyboardHelp.showQuickTip,
    onDismissQuickTip: keyboardHelp.dismissQuickTip,
    isHelpOpen: keyboardHelp.isHelpOpen,
    onCloseHelp: keyboardHelp.closeHelp,
    minWordLength,
    leadChangeEvent,
    gameMode,
    blastTileOverlay,
    wordHuntTargetLength,
    wordHuntAttempts,
    wordHuntFound,
    wordHuntLife,
    wordHuntPlayerLives,
    wordHuntEliminatedPlayers,
    onWordHuntGuess,
  } as const;

  // Portrait/Desktop Layout
  return (
    <PortraitLayout
      {...sharedLayoutProps}
      gameCode={gameCode}
      isHost={isHost}
      gameplayFocusMode={gameplayFocusMode}
      deferredLeaderboard={deferredLeaderboard}
      foundWords={normalizedFoundWords}
      tournamentData={tournamentData}
      totalBoardWords={totalBoardWords}
      gameStatsRef={gameStatsRef}
    >
      {children}
    </PortraitLayout>
  );
});

InGameScreen.displayName = 'InGameScreen';

export default InGameScreen;
