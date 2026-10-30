import type { RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { StartGameBroadcast, PlayerResultPayload } from '@/shared/types/socket';
import type { BlastTileState } from '@/shared/types/blast';
import type { BlastTileOverlay, BlastPlayerStats, WheelRushPlayerStats, LeaderboardEntry } from '@/shared/types/game';
import type { LetterGrid, Language } from '@/types';
import type { WordToVote } from '@/player/types';
import type { GameTimerReturn } from '@/hooks/useGameTimer';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface StartGameBroadcastExt extends StartGameBroadcast {
  gameSessionId?: number;
  boardTheme?: string;
  blastTileOverlay?: BlastTileOverlay[];
  blastPlayerMoves?: Record<string, number>;
  blastSeed?: number | null;
  blastGrid?: string[][];
  blastTileStates?: BlastTileState[][];
  wordHuntTargetLength?: number;
  wordHuntTargetCategory?: string | null;
  wordHuntPlayerLives?: Record<string, number>;
  wordHuntEliminatedPlayers?: string[];
  /** Reconnect-only: player's own found-word list, for UI replay */
  myFoundWords?: string[];
  /** Reconnect-only: authoritative leaderboard, for atomic score restore */
  leaderboard?: LeaderboardEntry[];
}

export interface ValidatedScoresPayload {
  scores: PlayerResultPayload[];
  letterGrid: LetterGrid | null;
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
  gameMode?: string;
  wordHuntSummary?: WordHuntSummary;
  blastSummary?: BlastSummary;
  wheelRushSummary?: WheelRushSummary;
  /** Server-built lesson recap; the host path already forwarded it. */
  classroomSummary?: ClassroomSummary;
  tvMode?: boolean;
  isRanked?: boolean;
  mmrChanges?: Record<string, { oldMmr: number; newMmr: number; delta: number }>;
}

export interface WordHuntSummary {
  targetWord: string;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  targetFoundBy: string | null;
  foundTarget: boolean;
  survivalTime: number;
  discoveryWords: number;
  playerAttempts?: Record<string, number>;
}

export interface BlastSummary {
  playerMoves: Record<string, number>;
  playerStats: Record<string, BlastPlayerStats>;
}

export interface WheelRushSummary {
  playerStats: Record<string, WheelRushPlayerStats>;
}

export interface TimeUpdatePayload {
  remainingTime: number;
  letterGrid?: LetterGrid;
  language?: Language;
  gameSessionId?: number;
}

export interface ResetGamePayload {
  gameSessionId?: number;
  message?: string;
}

export interface FinalScoresPayload {
  scores: PlayerResultPayload[];
}

export interface OnShowResultsData {
  scores: PlayerResultPayload[];
  letterGrid: LetterGrid | null;
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
  wordHuntSummary?: WordHuntSummary;
  blastSummary?: BlastSummary;
  wheelRushSummary?: WheelRushSummary;
  classroomSummary?: ClassroomSummary;
  isRanked?: boolean;
  mmrChanges?: Record<string, { oldMmr: number; newMmr: number; delta: number }>;
}

export interface UsePlayerGameEventsProps {
  socket: Socket | null;
  t: (key: string, fallback?: string) => string;
  username: string;
  onShowResults?: (data: OnShowResultsData) => void;

  // Local state (not in GameState context)
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<WordToVote | null>>;
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs (TODO: refactor to use context actions)
  comboLevelRef: RefObject<number>;
  lastWordTimeRef: RefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: RefObject<NodeJS.Timeout | null>;
  comboShieldsUsedRef: RefObject<number>;

  // Exit ref
  intentionalExitRef: RefObject<boolean>;

  // Music ref for tracking total game time
  totalGameTimeRef?: RefObject<number>;

  // Timer for multiplayer sync
  gameTimer?: GameTimerReturn;

  // Callbacks
  onGameStart?: () => void;
}

export interface UsePlayerGameEventsReturn {
  gameSessionIdRef: RefObject<number>;
}
