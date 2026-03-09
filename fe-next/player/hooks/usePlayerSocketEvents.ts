/**
 * Player Socket Events Hook
 * Orchestrates all player socket event handlers through domain-specific hooks
 *
 * REFACTORED: Reduced from 115 props to ~15 props using GameStateContext!
 *
 * This hook composes:
 * - usePlayerGameEvents: Game lifecycle (startGame, endGame, timeUpdate, resetGame, results)
 * - usePlayerWordEvents: Word submission feedback (wordAccepted, wordRejected, etc.)
 * - usePlayerSessionEvents: Connection, presence, achievements, XP
 * - usePlayerTournamentEvents: Tournament events
 *
 * All game state is now managed via GameStateContext - no more prop drilling!
 */
import { MutableRefObject, RefObject } from 'react';
import { Socket } from 'socket.io-client';
import {
  usePlayerGameEvents,
  usePlayerWordEvents,
  usePlayerSessionEvents,
  usePlayerTournamentEvents,
} from './socket';
import type { AchievementPayload } from '@/shared/types/socket';
import type { GameTimerReturn } from '@/hooks/useGameTimer';

interface UsePlayerSocketEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  inputRef: RefObject<HTMLInputElement | null>;
  username: string;
  queueAchievement: (achievement: AchievementPayload) => void;
  playComboSound: (level: number) => void;
  fireRoundActive?: boolean;
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number; wordHuntSummary?: any; blastSummary?: any }) => void;

  // Local state (not in GameState context)
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<any>>;
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs and setters (TODO: refactor to use context actions)
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  comboShieldsUsedRef: MutableRefObject<number>;

  // Timer for multiplayer sync
  gameTimer?: GameTimerReturn;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;

  // Music ref for tracking total game time
  totalGameTimeRef?: MutableRefObject<number>;

  // Callback when game starts
  onGameStart?: () => void;
}

/**
 * Custom hook for managing all player socket events
 * Composes domain-specific hooks for cleaner organization
 */
const usePlayerSocketEvents = ({
  socket,
  t,
  inputRef,
  username,
  queueAchievement,
  playComboSound,
  fireRoundActive = false,
  onShowResults,

  // Local state (not in GameState context)
  setShowWordFeedback,
  setWordToVote,
  setEarthquakeState,
  setFireRoundActive,
  setFireRoundRemaining,

  // Combo refs and setters
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,
  comboShieldsUsedRef,

  // Timer
  gameTimer,

  // Exit ref
  intentionalExitRef,

  // Music ref
  totalGameTimeRef,

  // Callbacks
  onGameStart,
}: UsePlayerSocketEventsProps): void => {
  // Game lifecycle events
  usePlayerGameEvents({
    socket,
    t,
    username,
    onShowResults,
    setShowWordFeedback,
    setWordToVote,
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
    intentionalExitRef,
    totalGameTimeRef,
    gameTimer,
    onGameStart,
  });

  // Word submission events
  usePlayerWordEvents({
    socket,
    t,
    inputRef,
    playComboSound,
    fireRoundActive,
    setShowWordFeedback,
    setWordToVote,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
  });

  // Session/connection events
  usePlayerSessionEvents({
    socket,
    t,
    username,
    queueAchievement,
    intentionalExitRef,
  });

  // Tournament events
  usePlayerTournamentEvents({
    socket,
    t,
  });
};

export default usePlayerSocketEvents;
