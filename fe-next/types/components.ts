/**
 * Component Prop Type Definitions
 * Types for major view components
 */

import type { Socket } from 'socket.io-client';
import type { Language, LetterGrid, ActiveRoom, Avatar, WordDetail } from '@/shared/types/game';

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
  avatar?: Avatar & { profilePictureUrl?: string };
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
  /** Letter grid from the game */
  letterGrid: LetterGrid | null;
  /** Game code */
  gameCode: string;
  /** Handler to return to the room/lobby */
  onReturnToRoom: () => void;
  /** Current user's username */
  username: string;
  /** Socket.IO connection */
  socket: Socket | null;
  /** Player achievements from the game */
  achievements?: GameAchievement[];
}

export interface HeatMapData {
  cellUsageCounts: Record<string, number>;
  maxCount: number;
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
