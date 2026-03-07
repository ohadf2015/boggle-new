/**
 * Host Socket Events Hook
 * Orchestrates all host socket event handlers through domain-specific hooks
 *
 * This hook composes:
 * - useHostGameEvents: Game lifecycle (startGame, endGame, timeUpdate, resetGame)
 * - useHostWordEvents: Word submission feedback (wordAccepted, wordRejected, etc.)
 * - useHostPlayerEvents: Player management (updateUsers, presence, achievements, XP)
 * - useHostTournamentEvents: Tournament events
 */
import { MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import {
  useHostGameEvents,
  useHostWordEvents,
  useHostPlayerEvents,
  useHostTournamentEvents,
} from './socket';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload, BoardTheme } from '@/shared/types/socket';
import type { Player } from '@/hooks/useGameState';

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: any[];
  isComplete?: boolean;
}

interface UseHostSocketEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  hostPlaying: boolean;
  gameStarted: boolean;
  tableData: any;
  username: string;
  queueAchievement: (achievement: AchievementPayload) => void;
  playComboSound: (level: number) => void;
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number; wordHuntSummary?: any }) => void;

  // State setters
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setFinalScores: React.Dispatch<React.SetStateAction<any>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setTableData: React.Dispatch<React.SetStateAction<any>>;
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<any>>;
  setWordsForBoard: React.Dispatch<React.SetStateAction<string[]>>;
  setBoardTheme: React.Dispatch<React.SetStateAction<BoardTheme | null>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

  // Earthquake state setters
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Results waiting state
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;

  // Combo refs and setters
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;

  // Tournament refs
  tournamentTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  tournamentData: TournamentData | null;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;

  // Callback when game starts (for music synchronization)
  onGameStart?: () => void;
}

/**
 * Custom hook for managing all host socket events
 * Composes domain-specific hooks for cleaner organization
 */
const useHostSocketEvents = ({
  socket,
  t,
  hostPlaying,
  gameStarted,
  username,
  queueAchievement,
  playComboSound,
  onShowResults,

  // State setters
  setPlayersReady,
  setPlayerWordCounts,
  setPlayerScores,
  setPlayerAchievements,
  setFinalScores,
  setRemainingTime,
  setGameStarted,
  setShowStartAnimation,
  setTableData,
  setHostFoundWords,
  setHostAchievements,
  setTournamentData,
  setTournamentCreating,
  setShufflingGrid,
  setWordsForBoard,
  setBoardTheme,

  // XP state setters
  setXpGainedData,
  setLevelUpData,

  // Earthquake state setters
  setEarthquakeState,
  setFireRoundActive,
  setFireRoundRemaining,

  // Results waiting state
  setWaitingForResults,

  // Combo refs and setters
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,

  // Tournament refs
  tournamentTimeoutRef,

  // Exit ref
  intentionalExitRef,

  // Music callback
  onGameStart,
}: UseHostSocketEventsProps): { gameSessionId: number } => {
  // Game lifecycle events
  const { gameSessionId } = useHostGameEvents({
    socket,
    t,
    gameStarted,
    username,
    hostPlaying,
    setGameStarted,
    setShowStartAnimation,
    setTableData,
    setRemainingTime,
    setWaitingForResults,
    setFinalScores,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setHostFoundWords,
    setHostAchievements,
    setTournamentData,
    setTournamentCreating,
    setShufflingGrid,
    setXpGainedData,
    setLevelUpData,
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    intentionalExitRef,
    onShowResults,
    onGameStart,
    setPlayersReady,
  });

  // Word submission events (for host playing)
  useHostWordEvents({
    socket,
    t,
    hostPlaying,
    playComboSound,
    setHostFoundWords,
    setWordsForBoard,
    setBoardTheme,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
  });

  // Player management events
  // Pass hostUsername to filter self-notifications when host is also playing
  useHostPlayerEvents({
    socket,
    t,
    hostPlaying,
    hostUsername: hostPlaying ? username : undefined,
    queueAchievement,
    setPlayersReady,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setHostAchievements,
    setXpGainedData,
    setLevelUpData,
  });

  // Tournament events
  useHostTournamentEvents({
    socket,
    t,
    setTournamentData,
    setTournamentCreating,
    tournamentTimeoutRef,
  });

  return { gameSessionId };
};

export default useHostSocketEvents;
