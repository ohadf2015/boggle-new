/**
 * useHostEffects - Side effects for HostView
 *
 * Consolidates all useEffect logic:
 * - Timer countdown
 * - Music transitions
 * - Pre-game animations
 * - Unload warnings
 * - Words for board requests
 */

import { useEffect, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import logger from '@/utils/logger';
import type { Language, LetterGrid, DifficultyLevel } from '@/types';
import type { Player } from '@/hooks/useGameState';
import { useGameMode } from '@/hooks/gameState';

interface UseHostEffectsOptions {
  socket: Socket | null;

  // Game state
  gameStarted: boolean;
  remainingTime: number | null;
  showStartAnimation: boolean;
  waitingForResults: boolean;
  tableData: LetterGrid;
  playersCount: number;

  // Settings
  difficulty: DifficultyLevel;
  roomLanguage: Language;
  language: Language;
  timerValue: number; // Timer duration in minutes

  // State setters
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  setHighlightedCells: React.Dispatch<React.SetStateAction<Array<{ row: number; col: number }>>>;
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;

  // Music controls (using any to avoid strict typing with music context)
  fadeToTrack: (track: any, fadeOut?: number, fadeIn?: number) => void;
  stopMusic: (fadeOut: number) => void;
  playCountdownBeep: (time: number) => void;
  TRACKS: { IN_GAME: any; ALMOST_OUT_OF_TIME: any; BOSSA_ARCADE: any; BOSSA: any };

  // Earthquake state for music transitions
  earthquakeState: 'idle' | 'warning' | 'shaking' | 'fire-round';

  // Refs
  hasTriggeredUrgentMusicRef: MutableRefObject<boolean>;
  earthquakeMusicActiveRef: MutableRefObject<boolean>;
  intentionalExitRef: MutableRefObject<boolean>;

  // Initial data
  initialPlayers: Player[];
}

export function useHostEffects(options: UseHostEffectsOptions): void {
  const gameMode = useGameMode();
  const {
    socket,
    gameStarted,
    remainingTime,
    showStartAnimation,
    waitingForResults,
    tableData,
    playersCount,
    difficulty,
    roomLanguage,
    language,
    setRemainingTime,
    setGameStarted,
    setShufflingGrid,
    setHighlightedCells,
    setPlayersReady,
    fadeToTrack,
    stopMusic,
    playCountdownBeep,
    TRACKS,
    hasTriggeredUrgentMusicRef,
    intentionalExitRef,
    initialPlayers,
  } = options;

  // Client-side countdown timer
  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(intervalId);
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameStarted, setRemainingTime]);

  // Urgent music trigger - plays after 33% of game time has elapsed
  useEffect(() => {
    if (
      gameStarted &&
      remainingTime !== null &&
      remainingTime > 0 &&
      !hasTriggeredUrgentMusicRef.current
    ) {
      // Calculate total time from timerValue (minutes to seconds)
      // timerValue defaults to 2 minutes
      const totalTimeSeconds = (options.timerValue || 2) * 60;
      // Trigger when 33% of time has elapsed (67% remaining)
      const triggerThreshold = totalTimeSeconds * 0.67;

      if (remainingTime <= triggerThreshold) {
        hasTriggeredUrgentMusicRef.current = true;
        // Only play if earthquake music is not active (earthquake music takes priority)
        if (!options.earthquakeMusicActiveRef.current) {
          fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 1000, 1000);
        }
      }
    }
    // When time runs out, music will transition to bossa for results validation (handled by waitingForResults effect)
  }, [remainingTime, gameStarted, fadeToTrack, TRACKS, hasTriggeredUrgentMusicRef, options.timerValue, options.earthquakeMusicActiveRef]);

  // Earthquake/Fire Round music - plays bossa-arcade during earthquake phases
  useEffect(() => {
    if (!gameStarted) return;

    const earthquakeMusicActiveRef = options.earthquakeMusicActiveRef;
    const earthquakeState = options.earthquakeState;

    // When earthquake starts (warning, shaking, or fire-round), play bossa-arcade
    if (earthquakeState !== 'idle' && !earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = true;
      fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
    }

    // When earthquake ends, keep playing bossa-arcade (don't restore to previous track)
    // This provides a consistent experience - earthquake music stays for remainder of game
    if (earthquakeState === 'idle' && earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = false;
      // Keep bossa-arcade playing - no track restoration needed
    }
  }, [options.earthquakeState, gameStarted, remainingTime, fadeToTrack, TRACKS, options.earthquakeMusicActiveRef, options.timerValue]);

  // Results validation music - plays bossa when entering results phase
  useEffect(() => {
    if (waitingForResults) {
      // Transition to bossa for results validation and results page
      fadeToTrack(TRACKS.BOSSA, 1500, 1500);
    }
  }, [waitingForResults, fadeToTrack, TRACKS]);

  // Countdown beep
  useEffect(() => {
    if (gameStarted && remainingTime !== null && remainingTime <= 10 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameStarted, playCountdownBeep]);

  // Reset urgent music ref when game starts
  useEffect(() => {
    if (gameStarted) {
      hasTriggeredUrgentMusicRef.current = false;
    }
  }, [gameStarted, hasTriggeredUrgentMusicRef]);

  // Activate game when countdown animation completes
  useEffect(() => {
    if (
      !showStartAnimation &&
      tableData &&
      remainingTime &&
      remainingTime > 0 &&
      !gameStarted &&
      !waitingForResults
    ) {
      logger.log('[HOST] Countdown animation complete, activating game');
      setGameStarted(true);
    }
  }, [showStartAnimation, tableData, remainingTime, gameStarted, waitingForResults, setGameStarted]);

  // Update players list from props
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers, setPlayersReady]);

  // Pre-game shuffling animation
  useEffect(() => {
    if (gameStarted) {
      setShufflingGrid(null);
      setHighlightedCells([]);
      return;
    }

    const currentLang = roomLanguage || language;
    const isBlast = gameMode === 'blast';
    const rows = isBlast ? 6 : DIFFICULTIES[difficulty].rows;
    const cols = isBlast ? 6 : DIFFICULTIES[difficulty].cols;

    const interval = setInterval(() => {
      const randomGrid = generateRandomTable(rows, cols, currentLang as Language);
      setShufflingGrid(randomGrid);
      setHighlightedCells([]);

      if (socket) {
        socket.emit('broadcastShufflingGrid', {
          grid: randomGrid,
          highlightedCells: [],
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [
    gameStarted,
    difficulty,
    roomLanguage,
    language,
    socket,
    gameMode,
    setShufflingGrid,
    setHighlightedCells,
  ]);

}

export default useHostEffects;
