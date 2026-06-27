/**
 * Component Prop Type Definitions
 * Types for major view components
 */

import type { Socket } from 'socket.io-client';
import type { Language, ActiveRoom, Avatar, WordDetail } from '@/shared/types/game';

// ==================== JoinView Types ====================

export interface JoinViewProps {
  /** Handler for joining/hosting a game */
  handleJoin: (isHost: boolean, language?: Language | null, gameCode?: string) => void;
  /** Current game code */
  gameCode: string;
  /** Current username */
  username: string;
  /** Setter for game code */
  setGameCode: (code: string) => void;
  /** Setter for username */
  setUsername: (name: string) => void;
  /** Error message to display */
  error: string | null;
  /** List of active game rooms */
  activeRooms: ActiveRoom[];
  /** Function to refresh room list */
  refreshRooms: () => void;
  /** Pre-filled room code from URL params */
  prefilledRoom: string | null;
  /** Room name for hosting */
  roomName: string;
  /** Setter for room name */
  setRoomName: (name: string) => void;
  /** Host username (player name for host) */
  hostUsername: string;
  /** Setter for host username */
  setHostUsername: (name: string) => void;
  /** Whether auto-joining is in progress */
  isAutoJoining: boolean;
  /** Whether rooms are loading */
  roomsLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Display name from profile */
  displayName: string;
  /** Whether profile is loading */
  isProfileLoading: boolean;
  /** Whether join operation is in progress */
  isJoining?: boolean;
}

export type JoinMode = 'join' | 'host';

// ==================== ResultsPage Types ====================

export interface GameAchievement {
  icon: string;
  key?: string;
  name?: string;
  description?: string;
}

export interface PlayerResult {
  username: string;
  score: number;
  avatar?: Avatar;
  isHost?: boolean;
  allWords?: WordDetail[];
  achievements?: GameAchievement[];
  uniqueWords?: string[];
  invalidWords?: string[];
  wordsFoundCount?: number;
  rank?: number;
  isBot?: boolean;
  title?: {
    icon: string;
    name: string;
    description: string;
  };
}

export interface ResultsPageProps {
  /** Final scores for all players */
  finalScores: PlayerResult[] | null;
  /** Game code (optional for single player) */
  gameCode?: string;
  /** Handler to return to the room/lobby (optional for single player) */
  onReturnToRoom?: () => void;
  /**
   * Handler to fully exit the game back to the multiplayer lobby, resetting MP
   * state IN PLACE (no page reload). Native-safe: a hard nav blanks the
   * Capacitor static-export WebView. When absent (e.g. single player) the
   * exit falls back to a client-side router navigation.
   */
  onExitToLobby?: () => void;
  /** Current user's username */
  username: string;
  /** Socket.IO connection */
  socket: Socket | null;
  /** Player achievements from the game */
  achievements?: GameAchievement[];
  /** Whether duplicate word rule is disabled (for rooms with >7 players) */
  duplicateRuleDisabled?: boolean;
  /** Number of players in the game */
  playerCount?: number;
  /** Whether the current user is the host */
  isHost?: boolean;
  /** Room language for starting new games */
  roomLanguage?: Language;
  /** Grid size for cognitive scoring */
  gridSize?: number;
  /** Game duration in seconds for cognitive scoring */
  gameDuration?: number;
  /** Series standings for accumulated scores across multiple games */
  seriesStandings?: Array<{ username: string; avatar?: { emoji?: string; color?: string }; totalScore: number; roundScores: number[]; currentRank: number; rankChange: number; roundWins: number }>;
  /** Current series round number */
  seriesRoundNumber?: number;
  /** Total games in the series */
  seriesTotalGames?: number;
  /** Username of the current series leader */
  seriesLeader?: string | null;
  /** Callback to reset the series tracker (start new series) */
  onResetSeries?: () => void;
  /** Word Hunt summary from server (target word, lives, eliminated) */
  wordHuntSummary?: { targetWord: string; playerLives: Record<string, number>; eliminatedPlayers: string[]; targetFoundBy: string | null; survivalTime?: number; discoveryWords?: number; playerAttempts?: Record<string, number> };
  /** Blast mode summary from server */
  blastSummary?: { playerMoves?: Record<string, number>; playerStats?: Record<string, import('@/shared/types/game').BlastPlayerStats> };
  /** Wheel Rush mode summary from server */
  wheelRushSummary?: { playerStats?: Record<string, import('@/shared/types/game').WheelRushPlayerStats> };
}

export interface VoteInfo {
  netScore?: number;
  totalVotes?: number;
  votesNeeded?: number;
  isValidForScoring?: boolean;
  approvalCount?: number;
  disapprovalCount?: number;
  requiredApprovals?: number;
}

export interface WordToVote {
  word: string;
  submittedBy: string;
  submitterAvatar?: { emoji: string; color: string } | null;
  voteInfo?: VoteInfo;
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

// ==================== XP/Level Types ====================

export interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
  // Legacy properties for backwards compatibility
  totalXp?: number;
  breakdown?: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
}

export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

// ==================== Grid Position Types ====================

export interface GridPosition {
  row: number;
  col: number;
}
