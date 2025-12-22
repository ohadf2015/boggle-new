/**
 * Player Socket Events Hook
 * Orchestrates all player socket event handlers through domain-specific hooks
 *
 * This hook composes:
 * - usePlayerGameEvents: Game lifecycle (startGame, endGame, timeUpdate, resetGame, results)
 * - usePlayerWordEvents: Word submission feedback (wordAccepted, wordRejected, etc.)
 * - usePlayerSessionEvents: Connection, presence, achievements, XP
 * - usePlayerTournamentEvents: Tournament events
 */
import { MutableRefObject, RefObject } from 'react';
import { Socket } from 'socket.io-client';
import {
  usePlayerGameEvents,
  usePlayerWordEvents,
  usePlayerSessionEvents,
  usePlayerTournamentEvents,
} from './socket';
import type { Language } from '@/types';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload } from '@/shared/types/socket';

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  timestamp?: number;
}

interface Player {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  isComplete?: boolean;
}

interface WordToVote {
  word: string;
  submittedBy: string;
  submitterAvatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string;
  };
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

interface UsePlayerSocketEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  inputRef: RefObject<HTMLInputElement | null>;
  wasInActiveGame: boolean;
  gameActive: boolean;
  letterGrid: any;
  gameLanguage: Language | null;
  username: string;
  queueAchievement: (achievement: AchievementPayload) => void;
  playComboSound: (level: number) => void;
  fireRoundActive?: boolean;
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number }) => void;

  // State setters
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<any>>;
  setHighlightedCells: React.Dispatch<React.SetStateAction<any>>;
  setWasInActiveGame: React.Dispatch<React.SetStateAction<boolean>>;
  setFoundWords: React.Dispatch<React.SetStateAction<FoundWord[]>>;
  setAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  setLetterGrid: React.Dispatch<React.SetStateAction<any>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  setGameLanguage: React.Dispatch<React.SetStateAction<Language | null>>;
  setGameActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setLeaderboard: React.Dispatch<React.SetStateAction<any[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentStandings: React.Dispatch<React.SetStateAction<any[]>>;
  setShowTournamentStandings: React.Dispatch<React.SetStateAction<boolean>>;

  // Word feedback state setters
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<WordToVote | null>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

  // Earthquake/Fire Round state setters
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs and setters
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;

  // Combo shield system
  comboShieldsUsedRef: MutableRefObject<number>;
  foundWords: FoundWord[];

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;

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
  letterGrid,
  gameLanguage,
  username,
  queueAchievement,
  playComboSound,
  fireRoundActive = false,
  onShowResults,

  // State setters
  setPlayersReady,
  setShufflingGrid,
  setHighlightedCells,
  setWasInActiveGame,
  setFoundWords,
  setAchievements,
  setLetterGrid,
  setRemainingTime,
  setMinWordLength,
  setGameLanguage,
  setGameActive,
  setShowStartAnimation,
  setWaitingForResults,
  setLeaderboard,
  setTournamentData,
  setTournamentStandings,
  setShowTournamentStandings,

  // Word feedback state setters
  setShowWordFeedback,
  setWordToVote,

  // XP state setters
  setXpGainedData,
  setLevelUpData,

  // Earthquake/Fire Round state setters
  setEarthquakeState,
  setFireRoundActive,
  setFireRoundRemaining,

  // Combo refs and setters
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,

  // Combo shield system
  comboShieldsUsedRef,
  foundWords,

  // Exit ref
  intentionalExitRef,

  // Music callback
  onGameStart,
}: UsePlayerSocketEventsProps): void => {
  // Game lifecycle events
  usePlayerGameEvents({
    socket,
    t,
    letterGrid,
    gameLanguage,
    username,
    onShowResults,
    setWasInActiveGame,
    setFoundWords,
    setAchievements,
    setLetterGrid,
    setRemainingTime,
    setMinWordLength,
    setGameLanguage,
    setGameActive,
    setShowStartAnimation,
    setWaitingForResults,
    setLeaderboard,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setShowWordFeedback,
    setWordToVote,
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
    comboShieldsUsedRef,
    intentionalExitRef,
    onGameStart,
  });

  // Word submission events
  usePlayerWordEvents({
    socket,
    t,
    inputRef,
    playComboSound,
    foundWords,
    fireRoundActive,
    setFoundWords,
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
    setPlayersReady,
    setShufflingGrid,
    setHighlightedCells,
    setAchievements,
    setLeaderboard,
    setXpGainedData,
    setLevelUpData,
    intentionalExitRef,
  });

  // Tournament events
  usePlayerTournamentEvents({
    socket,
    t,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
  });
};

export default usePlayerSocketEvents;
