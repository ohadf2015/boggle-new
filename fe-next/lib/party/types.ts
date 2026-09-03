import type { LetterGrid } from '@/shared/types/game';

export type PartyPhase = 'setup' | 'handoff' | 'play' | 'roundBreakdown' | 'podium';

export interface PartyPlayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface PartySetup {
  players: PartyPlayer[];
  roundCount: number;
  rows: number;
  cols: number;
  language: string;
  timerSeconds: number;
}

export interface FoundWord {
  word: string;
  score: number;
  unique: boolean;
}

export interface PlayerRoundResult {
  playerId: string;
  words: FoundWord[];
  roundScore: number;
}

export interface PartyState {
  version: 1;
  setup: PartySetup;
  phase: Exclude<PartyPhase, 'setup'>;
  roundIndex: number;
  playerIndex: number;
  board: LetterGrid;
  claimedThisRound: string[];
  currentFound: FoundWord[];
  currentScore: number;
  roundResults: PlayerRoundResult[][];
  totals: Record<string, number>;
}

export interface RankedPlayer {
  player: PartyPlayer;
  score: number;
  place: number;
}

export const PARTY_MIN_PLAYERS = 2;
export const PARTY_MAX_PLAYERS = 6;
export const PARTY_MIN_ROUNDS = 1;
export const PARTY_MAX_ROUNDS = 10;
export const PARTY_MIN_TIMER = 30;
export const PARTY_MAX_TIMER = 180;
export const PARTY_BOARD_SIZES = [4, 5, 6] as const;
export const PARTY_STATE_VERSION = 1 as const;
