/**
 * The small interface every MP game mode implements. Handlers never branch on
 * `gameMode ===`; they ask the mode's module (./index.ts) and its rules row
 * (./rules.ts). Every hook is optional — a mode only says what differs.
 */

import type { Server } from 'socket.io';
import type { GameMode, Language, LetterGrid } from '@/shared/types';
import type { GameState } from '../modules/gameState/types';
import type { ClassroomGame } from '../modules/classroomGameManager';

/** Everything a mode may need to set up its round once the board is dealt. */
export interface ModeRoundContext {
  io: Server;
  gameCode: string;
  game: GameState;
  language: Language;
  letterGrid: LetterGrid;
  gridRows: number;
  gridCols: number;
  /** Players who play (a watching TV/classroom host excluded; bots included). */
  playerUsernames: string[];
  humanUsernames: string[];
  /** Lesson words to embed on the board (classroom), uppercase. */
  vocabToEmbed: string[];
  classroomGame: ClassroomGame | null;
}

export interface ModeRoundResult {
  /** The mode rebuilt the board (e.g. Word Hunt embeds its target). */
  letterGrid?: LetterGrid;
  /** The mode could not set up and hands the round to another mode. */
  downgradeTo?: GameMode;
  /** Board word count, when the mode already solved the board. */
  totalBoardWords?: number;
}

/** Who a startGame-shaped payload is for. */
export interface PayloadView {
  /** The receiving player, or null for a room-wide broadcast. */
  username: string | null;
  /** Mid-round re-entry (reconnect / late join / recovery) vs a fresh start. */
  resume: boolean;
}

export interface GameModeModule {
  id: GameMode;
  /** Create the mode's round state on `ctx.game`. */
  initRound?(ctx: ModeRoundContext): ModeRoundResult | void | Promise<ModeRoundResult | void>;
  /** Mode fields on every startGame-shaped payload (start, retry, reconnect, late join, recovery). */
  payloadFields?(game: GameState, view: PayloadView): Record<string, unknown>;
  /** Seat a player who joins mid-round (before their payload is built). */
  onLateJoin?(game: GameState, username: string): void;
  /** Room broadcasts right after startGame (mode views mount on startGame). */
  afterStart?(io: Server, gameCode: string, game: GameState): void;
  /** Mode block(s) merged into the results payload. */
  resultsSummary?(game: GameState): Record<string, unknown>;
  /** Final ranking override. */
  rankResults?<T extends { username: string; totalScore: number }>(scores: T[], game: GameState): T[];
}
