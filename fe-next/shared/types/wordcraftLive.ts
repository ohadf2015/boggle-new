/**
 * Live classroom Wordcraft — the wire contract between the per-student race
 * server loop and both client surfaces (student phone, host projector).
 *
 * Unlike the vocab quiz, Wordcraft IS a `GameMode` (shared/types/game.ts) —
 * the room starts it through the normal `startGame` path the way Wheel Rush
 * does, and these events carry only what the shared payload cannot: each
 * student's PERSONAL board/rack (per-socket, never room-wide) and the live
 * placement feed the projector paints.
 */

import type { RackTile } from '@/lib/word-craft/types';

export const WORDCRAFT_LIVE_EVENTS = {
  /** Student → server: attempt a placement. */
  place: 'wordcraft:place',
  /** Server → the placing student: accepted (fresh snapshot follows) or rejected. */
  placeResult: 'wordcraft:placeResult',
  /** Student → server: (re)pull my board — mount, reconnect, late join. */
  requestState: 'wordcraft:requestState',
  /** Server → one student: their personal board/rack/race state. */
  state: 'wordcraft:state',
  /** Server → room, once after startGame: the race exists, mount your surface. */
  init: 'wordcraft:init',
  /** Server → room: one student's accepted move — the projector's live feed. */
  activity: 'wordcraft:activity',
  /** Spectator ↔ server: pull the projector checklist (mount/reload mid-race). */
  projectorState: 'wordcraft:projectorState',
} as const;

/** One occupied board cell as the student sees it. Premiums come from the size. */
export interface WordcraftLiveCell {
  row: number;
  col: number;
  letter: string;
  value: number;
  isBlank: boolean;
  /** Who placed it — the student or their personal bot rival. */
  by: 'player' | 'bot';
}

/** A lesson word and whether THIS student has already built it. */
export interface WordcraftLiveTarget {
  word: string;
  built: boolean;
}

/**
 * The student's personal race state. Deliberately carries NO bot rack: a
 * student's devtools must never hold the answer key to their own board.
 */
export interface WordcraftLiveSnapshot {
  gameCode: string;
  boardSize: number;
  rack: RackTile[];
  cells: WordcraftLiveCell[];
  /** The Baron's score on this student's board — the personal rival to beat. */
  botScore: number;
  /** This student's score, so a reconnect repaints the HUD without waiting. */
  myScore: number;
  moves: number;
  /** Tiles left in the personal sack — the round's own clock. */
  bagCount: number;
  targets: WordcraftLiveTarget[];
}

export interface WordcraftLivePlaceResult {
  accepted: boolean;
  error?: string;
  invalidWord?: string;
  /** The words formed and their scores — the student's own celebration moment. */
  words?: { word: string; score: number }[];
  score?: number;
  bingo?: boolean;
  /** The Baron's answering move, or null when the bot passed. */
  bot?: { word: string; score: number } | null;
  botScore?: number;
}

/** One accepted move, room-wide — the projector's "Maya placed QUIZ +38" beat. */
export interface WordcraftLiveActivity {
  username: string;
  words: { word: string; score: number }[];
  score: number;
  bingo: boolean;
  /** A lesson target this move built, when it built one — the teaching moment. */
  lessonWord?: string | null;
}

export interface WordcraftLiveInit {
  gameCode: string;
  boardSize: number;
  /** Lesson words in play this round (tile form, uppercase). */
  targets: string[];
}

/**
 * The projector's spectator pull. Unlike `state`, this NEVER deals a seat:
 * the checklist is derived from the dealt session, so a teacher reloading the
 * projector mid-race gets every target with its CLASS-wide built flag without
 * becoming a player (pitfall class 3 — reconnect must restore, not restart).
 */
export interface WordcraftLiveProjectorState {
  gameCode: string;
  boardSize: number;
  targets: WordcraftLiveTarget[];
}
