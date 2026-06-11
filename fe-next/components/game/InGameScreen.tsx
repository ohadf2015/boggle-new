'use client';

import { useRef, useEffect, useCallback, useMemo, memo, useState } from 'react';
import {
  useBlastTileOverlay,
  useWordHuntTargetLength,
  useWordHuntMyLife,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
} from '@/hooks/gameState/store';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useAnnouncer } from '../GameAnnouncer';
import { useAutoScrollOnGameStart } from '@/hooks/useAutoScrollOnGameStart';
import { useSelectionStore, resetSelection, useFrozenWhileSelecting } from '@/hooks/useSelectionStore';
import { useTapToDragGuidance } from '@/hooks/useTapToDragGuidance';
import { useMPStuckCoach } from '@/hooks/useMPStuckCoach';
import { MPStuckCoachCard } from '@/components/game/ftue/MPStuckCoachCard';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useKeyboardHelpState } from '@/hooks/useKeyboardHelpState';
import { useLeadChangeDetection } from '@/hooks/useLeadChangeDetection';
import type { WordFeedback } from './WordFormingArea';
import type { FoundWord } from '@/shared/types/view';
import { detectSpecialCombos } from '@/components/blast/legacy/utils/blastCombos';
import type { BlastTileState } from '@/components/blast/legacy/types';
import type { SelectedCell } from '@/components/grid';

// Extracted hooks
import {
  useWordSubmission,
  useEarthquakeEffects,
  useSocketFeedback,
} from './in-game/hooks';

// Extracted sub-components
import { PortraitLayout } from './in-game/components';
import type { RoundEventState } from './in-game/components/RoundEventOverlay';
import type { SpecialWordEvent } from './in-game/components/SpecialWordToast';

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
  timerValue = 1.5,
  gameActive = true,
  showStartAnimation = false,
  gameLanguage = 'en',
  minWordLength = 2,
  comboLevel = 0,
  comboLevelRef,
  lastWordTime = null,

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
  onWordHuntGuess,

  // Desktop shell integration
  inDesktopShell = false,
}) {
  // Mode-overlay state read directly from store — keeps parents from
  // re-rendering on irrelevant store updates (was previously prop-passed
  // by MultiplayerInGameView + PlayerInGameView, churning them on every
  // word-hunt/blast tick even when their gameMode isn't classic).
  const blastTileOverlay = useBlastTileOverlay();
  const wordHuntTargetLength = useWordHuntTargetLength();
  const wordHuntAttempts = useWordHuntTargetAttempts();
  const wordHuntFound = useWordHuntTargetFound();
  const wordHuntLife = useWordHuntMyLife();
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();
  // Sound effects
  const {
    playWordAcceptedSound,
    playWordRejectedSound,
    playWordLengthSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
    playComboMilestoneSound,
    playComboBreakSound,
    playRoundStartSound,
    playTimesUpSound,
    playTimerHeartbeatSound,
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

  // CrazyGames SDK lifecycle — clear stale banners when game starts
  const { clearAllBanners } = useCrazyGames();
  const hasClearedBannersRef = useRef(false);
  useEffect(() => {
    if (gameActive && !hasClearedBannersRef.current) {
      hasClearedBannersRef.current = true;
      clearAllBanners();
    }
    if (!gameActive) hasClearedBannersRef.current = false;
  }, [gameActive, clearAllBanners]);

  const isGameOver = remainingTime === 0;
  useCrazyGamesLifecycle({
    isGameActive: gameActive && !isGameOver,
    isGameOver,
    maxCombo: comboLevel,
    wordsFound: foundWords.length,
  });

  // State — formedWord/letterCount live in useSelectionStore (subscribed by
  // WordFormingAreaConnected only). Keeping them out of InGameScreen state
  // prevents this whole tree from re-rendering on every cell entered during a drag.
  const [currentFeedback, setCurrentFeedback] = useState<WordFeedback | null>(null);
  const [lastWordFoundTime, setLastWordFoundTime] = useState<number>(() => (gameActive ? Date.now() : 0));

  // Freeze leaderboard/found-words while the player is mid-drag. Socket bursts
  // (opponents scoring 4-6/sec in active MP rooms) used to cascade through
  // PortraitLayout → CompactLeaderboard / GameLeaderboard during selection,
  // stealing frame budget from the grid drag rendering ("UI stuck when
  // selecting words"). The frozen value reveals the latest state the instant
  // the player releases — leaderboard catches up immediately.
  const deferredLeaderboard = useFrozenWhileSelecting(leaderboard);
  const deferredFoundWords = useFrozenWhileSelecting(foundWords);

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
    resetSelection();
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

  // Desktop detection via pointer capability (no UA sniffing)
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: fine)').matches;
  }, []);

  // Single FTUE arbiter for confused classic-MP players (idle / tap-only /
  // fruitless-fiddle). One coordinator → never stacks popups, never nags veterans.
  const stuckCoach = useMPStuckCoach({
    active: gameActive && isPlaying && !showStartAnimation,
    isClassic: gameMode === 'classic',
    totalGamesPlayed: totalGamesPlayed ?? 0,
    isDesktop,
  });

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

  // Lead change detection — use deferred leaderboard so socket burst updates
  // don't churn this hook + downstream sound effects during active drag.
  const leadChangeEvent = useLeadChangeDetection(deferredLeaderboard, username);

  // Play sound on lead change
  useEffect(() => {
    if (!leadChangeEvent) return;
    if (leadChangeEvent.type === 'took-lead') {
      playComboMilestoneSound(5);
    } else {
      playComboBreakSound(1);
    }
  }, [leadChangeEvent, playComboMilestoneSound, playComboBreakSound]);

  // Golden letter positions from backend startGame payload
  const [goldenLetters, setGoldenLetters] = useState<Array<{ row: number; col: number }>>([]);

  // Round event state
  const [roundEvent, setRoundEvent] = useState<RoundEventState | null>(null);
  const roundEventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Round event tile effects — frozen (blizzard), charged (lightning), meteor (crater)
  const [eventTiles, setEventTiles] = useState<{
    frozen: Set<string>;
    charged: Set<string>;
    meteor: Set<string>;
  }>({ frozen: new Set(), charged: new Set(), meteor: new Set() });

  // Special word toast state
  const [specialWordEvent, setSpecialWordEvent] = useState<SpecialWordEvent | null>(null);
  const specialWordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rush tiles — recurring transient bonus tiles spawned by the server for all
  // players (~10s each). Server owns spawn AND clear; the local fallback timer is
  // a visual safety net only (never authoritative) in case a clear event drops.
  const [rushTiles, setRushTiles] = useState<Set<string>>(() => new Set());
  const rushTileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer state for heartbeat sound and screen border glow
  const [timerUrgencyState, setTimerUrgencyState] = useState<'normal' | 'low' | 'veryLow' | 'critical'>('normal');
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heartbeat sound at ≤10s
  useEffect(() => {
    if (timerUrgencyState === 'veryLow' || timerUrgencyState === 'critical') {
      if (!heartbeatIntervalRef.current) {
        heartbeatIntervalRef.current = setInterval(() => {
          playTimerHeartbeatSound();
        }, timerUrgencyState === 'critical' ? 600 : 1000);
      }
    } else {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [timerUrgencyState, playTimerHeartbeatSound]);

  // Socket listeners for new round events, special words, and golden letters
  useEffect(() => {
    if (!socket) return;

    const handleGoldenLetters = (data: { goldenLetters?: Array<{ row: number; col: number }>; reconnect?: boolean }) => {
      // Only update when the payload explicitly carries goldenLetters. Reconnect /
      // late-join startGame emits omit the field, which previously clobbered the
      // existing golden tiles (stars vanished mid-game after a re-render).
      if (data.goldenLetters !== undefined) {
        setGoldenLetters(data.goldenLetters);
      }
    };

    const handleRoundEventWarning = (data: { eventType: string }) => {
      const type = data.eventType as RoundEventState['type'];
      setRoundEvent({ type, phase: 'warning' });
    };

    const handleRoundEventStart = (data: { eventType: string; duration: number; data?: Record<string, unknown> }) => {
      const type = data.eventType as RoundEventState['type'];
      setRoundEvent({ type, phase: 'active', duration: data.duration });

      // Extract affected tiles from event data
      const eventData = data.data ?? {};
      if (type === 'blizzard' && eventData.blizzard) {
        const bd = eventData.blizzard as { frozenTiles?: Array<{ row: number; col: number }> };
        if (bd.frozenTiles) {
          setEventTiles(prev => ({ ...prev, frozen: new Set(bd.frozenTiles!.map(t => `${t.row}-${t.col}`)) }));
        }
      } else if (type === 'lightning' && eventData.lightning) {
        const ld = eventData.lightning as { chargedTiles?: Array<{ row: number; col: number }> };
        if (ld.chargedTiles) {
          setEventTiles(prev => ({ ...prev, charged: new Set(ld.chargedTiles!.map(t => `${t.row}-${t.col}`)) }));
        }
      } else if (type === 'meteor' && eventData.meteor) {
        const md = eventData.meteor as { affectedTiles?: Array<{ row: number; col: number }> };
        if (md.affectedTiles) {
          setEventTiles(prev => ({ ...prev, meteor: new Set(md.affectedTiles!.map(t => `${t.row}-${t.col}`)) }));
        }
      }

      if (roundEventTimerRef.current) clearTimeout(roundEventTimerRef.current);
      roundEventTimerRef.current = setTimeout(() => {
        setRoundEvent(null);
      }, data.duration * 1000);
    };

    const handleRoundEventEnd = () => {
      if (roundEventTimerRef.current) clearTimeout(roundEventTimerRef.current);
      setRoundEvent(null);
      setEventTiles({ frozen: new Set(), charged: new Set(), meteor: new Set() });
    };

    const handleSpecialWordFound = (data: { word: string; bonus?: number; username?: string }) => {
      setSpecialWordEvent({
        word: data.word,
        bonus: data.bonus ?? 10,
        finderUsername: data.username ?? '',
      });
      if (specialWordTimerRef.current) clearTimeout(specialWordTimerRef.current);
      specialWordTimerRef.current = setTimeout(() => {
        setSpecialWordEvent(null);
      }, 3000);
    };

    const handleRushTilesSpawn = (data: { tiles?: Array<{ row: number; col: number }>; durationMs?: number }) => {
      const tiles = data.tiles ?? [];
      setRushTiles(new Set(tiles.map(t => `${t.row}-${t.col}`)));
      // Visual safety net only — clear locally a touch after the advertised
      // lifetime in case the server's clear broadcast is dropped. Scoring stays
      // server-authoritative regardless.
      if (rushTileTimerRef.current) clearTimeout(rushTileTimerRef.current);
      rushTileTimerRef.current = setTimeout(() => {
        setRushTiles(new Set());
      }, (data.durationMs ?? 10_000) + 2_000);
    };

    const handleRushTilesClear = () => {
      if (rushTileTimerRef.current) clearTimeout(rushTileTimerRef.current);
      setRushTiles(new Set());
    };

    socket.on('startGame', handleGoldenLetters);
    socket.on('roundEventWarning', handleRoundEventWarning);
    socket.on('roundEventStart', handleRoundEventStart);
    socket.on('roundEventEnd', handleRoundEventEnd);
    socket.on('specialWordFound', handleSpecialWordFound);
    socket.on('rushTilesSpawn', handleRushTilesSpawn);
    socket.on('rushTilesClear', handleRushTilesClear);

    return () => {
      socket.off('startGame', handleGoldenLetters);
      socket.off('roundEventWarning', handleRoundEventWarning);
      socket.off('roundEventStart', handleRoundEventStart);
      socket.off('roundEventEnd', handleRoundEventEnd);
      socket.off('specialWordFound', handleSpecialWordFound);
      socket.off('rushTilesSpawn', handleRushTilesSpawn);
      socket.off('rushTilesClear', handleRushTilesClear);
      if (roundEventTimerRef.current) clearTimeout(roundEventTimerRef.current);
      if (specialWordTimerRef.current) clearTimeout(specialWordTimerRef.current);
      if (rushTileTimerRef.current) clearTimeout(rushTileTimerRef.current);
    };
  }, [socket]);

  // Golden letters are now driven entirely by the server's startGame payload
  // (which always includes the field, even as []). Don't pre-emptively clear
  // when gameActive flickers — a transient false would wipe the tiles and the
  // next round's payload re-broadcast is the only place that could restore
  // them, which doesn't happen mid-round.

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
    playWordRejectedSound,
    announceWordResult,
    onWordSubmit,
    onResetCombo,
    setCurrentFeedback,
    setLastWordFoundTime,
    comboTypeRef,
  });

  // Count every submit attempt so the coach can distinguish "spelling junk"
  // (validity confusion) from "never submits" (gesture confusion).
  const handleTrackedWordSubmit = useCallback(
    (word: string, meta?: { inputMethod: 'kb' | 'drag' }) => {
      stuckCoach.markSubmit();
      handleGridWordSubmit(word, meta);
    },
    [stuckCoach, handleGridWordSubmit]
  );

  // A single tap that released on one tile = "clicking randomly" — feed the coach
  // alongside the legacy tap-to-drag detector.
  const handleSingleTap = useCallback(
    (cell: { row: number; col: number; letter: string }) => {
      stuckCoach.markTap();
      tapDragGuidance.handleSingleTapDetected(cell);
    },
    [stuckCoach, tapDragGuidance]
  );

  // Update fireRoundActiveRef when fireRoundActive changes
  useEffect(() => {
    fireRoundActiveRef.current = fireRoundActive;
  }, [fireRoundActive, fireRoundActiveRef]);

  // Socket feedback hook — owns server-truth audio (accept on server's wordAccepted,
  // reject + haptic error on rejection events). Prevents MP audio-lie.
  useSocketFeedback({
    socket,
    isPlaying,
    t,
    setCurrentFeedback,
    setLastWordFoundTime,
    playWordAcceptedSound,
    playWordRejectedSound,
    playWordLengthSound,
    onWordAccepted: stuckCoach.markAccepted,
  });

  // Keyboard word input
  const keyboardInput = useKeyboardWordInput({
    grid: letterGrid,
    language: gameLanguage || 'en',
    gameLanguage: gameLanguage,
    enabled: isPlaying && gameActive && !showStartAnimation,
    onWordSubmit: handleTrackedWordSubmit,
    minWordLength,
  });

  // Keyboard help state
  const keyboardHelp = useKeyboardHelpState({
    enabled: isDesktop && isPlaying,
    enableQuickTip: isDesktop,
  });

  // Word change handler — pushes selection into useSelectionStore so only
  // WordFormingAreaConnected re-renders. InGameScreen + PortraitLayout no longer
  // re-render per cell entered during a drag.
  const dragCountedRef = useRef(false);
  const handleWordChange = useCallback((word: string, count: number) => {
    // Detect a real drag (path of 2+ tiles) once per gesture → feeds the coach's
    // "builds words but never submits" signal. Reset when the path clears.
    if (count === 0) {
      dragCountedRef.current = false;
    } else if (count >= 2 && !dragCountedRef.current) {
      dragCountedRef.current = true;
      stuckCoach.markDragStart();
    }
    useSelectionStore.getState().setSelection(word, count);
  }, [stuckCoach]);

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
    lastWordTime,
    fireRoundActive,
    hasAnimated: hasAnimatedRef.current,
    earthquakeState,
    playerScore: playerData.score,
    playerRank: playerData.rank,
    currentFeedback,
    isTypingMode: keyboardInput.isTypingMode,
    typedWord: keyboardInput.typedWord,
    highlightedCells: keyboardInput.highlightedCells,
    lastWordFoundTime,
    totalGamesPlayed,
    onExitRoom,
    onShowTutorial,
    onWordSubmit: handleTrackedWordSubmit,
    onPathSubmit: handlePathSubmit,
    onWordChange: handleWordChange,
    onSingleTapDetected: handleSingleTap,
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
    goldenLetters,
    roundEvent,
    eventTiles,
    rushTiles,
    specialWordEvent,
    timerUrgencyState,
    onTimerState: setTimerUrgencyState,
  } as const;

  // Portrait/Desktop Layout
  return (
    <>
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
        inDesktopShell={inDesktopShell}
      >
        {children}
      </PortraitLayout>
      {/* Stuck-player coach: fixed bottom-center, above the grid. Mobile + desktop. */}
      {stuckCoach.visible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3">
          <MPStuckCoachCard
            stage={stuckCoach.stage}
            onDismiss={() => stuckCoach.dismiss('manual')}
          />
        </div>
      )}
    </>
  );
});

InGameScreen.displayName = 'InGameScreen';

export default InGameScreen;
