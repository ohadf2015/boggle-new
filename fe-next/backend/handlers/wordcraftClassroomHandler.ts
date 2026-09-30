/**
 * Live classroom Wordcraft — socket handler.
 *
 * Thin by design: the race arithmetic lives in
 * `backend/modules/wordcraftClassroomManager` (pure, fully tested); this file
 * only validates envelopes, enforces room/mode guards, folds accepted moves
 * into the SAME score aggregates every board mode feeds (playerWords +
 * playerScores + playerEventBonuses — so the live leaderboard AND the
 * end-of-round recompute tell one story), and broadcasts the two surfaces:
 * the student's personal board (per-socket) and the projector's activity beat
 * (room-wide).
 *
 * The room-wide broadcasts are deliberately NON-volatile: they fire in the
 * same tick as the two personal emits above them, and a volatile packet sent
 * while the transport is still flushing those is silently dropped — a
 * leaderboard that vanishes after a scoring move is pitfall class 4, not a
 * bandwidth saving.
 *
 * The room clock is the normal game timer — no parallel loop. When it fires,
 * `endGame` builds `classroomSummary` from the words recorded here, so the
 * podium, session standings, missed-words reteach list and teacher report all
 * work without a wordcraft-specific results path.
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../modules/gameStateManager.js';
import {
  addPlayerWord,
  updatePlayerScore,
  addPlayerEventBonus,
  getLeaderboardThrottled,
  type LeaderboardPlayer,
  type ScoreGameBase,
} from '../modules/scoreManager.js';
import { isDictionaryWord } from '../dictionary.js';
import {
  applyWordcraftMove,
  ensureWordcraftPlayer,
  wordcraftSnapshotFor,
  wordcraftTargetsProgress,
  type WordcraftLiveSession,
} from '../modules/wordcraftClassroomManager.js';
import type { DictionaryCheck } from '@/lib/word-craft/moveValidator';
import type { PlacedTile } from '@/lib/word-craft/types';
import {
  WORDCRAFT_LIVE_EVENTS,
  type WordcraftLiveActivity,
  type WordcraftLivePlaceResult,
  type WordcraftLiveProjectorState,
} from '@/shared/types/wordcraftLive';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

const placementSchema = z.object({
  row: z.number().int().min(0).max(14),
  col: z.number().int().min(0).max(14),
  letter: z.string().min(1).max(4),
  value: z.number().int().min(0).max(100),
  isBlank: z.boolean().optional(),
  rackTileId: z.string().min(1).max(40),
});

const placeSchema = z.object({
  placements: z.array(placementSchema).min(1).max(15),
});

interface WordcraftRoomGame {
  gameCode: string;
  gameState?: string;
  gameMode?: string;
  language?: string;
  wordcraftState?: WordcraftLiveSession | null;
  playerScores?: Record<string, number>;
  users?: Record<string, { isBot?: boolean; isHost?: boolean }>;
}

/** The wordcraft race this socket sits in, or null for any other room. */
function raceForSocket(socket: Socket): { gameCode: string; game: WordcraftRoomGame; session: WordcraftLiveSession } | null {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return null;
  const game = getGame(gameCode) as WordcraftRoomGame | null;
  if (!game || game.gameMode !== 'wordcraft') return null;
  if (!game.wordcraftState) {
    // A wordcraft room without its race is a dead round at 0 — loud, not silent.
    logger.warn(
      'WORDCRAFT',
      `${socket.id} reached a wordcraft handler in ${gameCode} but wordcraftState is missing (state=${game.gameState})`,
    );
    return null;
  }
  return { gameCode, game, session: game.wordcraftState };
}

/**
 * The round's dictionary: the backend's word list for the room language, plus
 * the lesson targets themselves — a teacher's word must ALWAYS be placeable,
 * even when the approved list has not caught up with the curriculum.
 */
function dictionaryFor(language: string, targets: readonly string[]): DictionaryCheck {
  const lesson = new Set(targets);
  return (word: string) => {
    const upper = word.toUpperCase();
    if (lesson.has(upper)) return true;
    try {
      return isDictionaryWord(word.toLowerCase(), language as never) === true;
    } catch {
      return false;
    }
  };
}

function myScore(game: WordcraftRoomGame, username: string): number {
  return game.playerScores?.[username] ?? 0;
}

function emitPersonalState(socket: Socket, game: WordcraftRoomGame, session: WordcraftLiveSession, username: string): void {
  socket.emit(WORDCRAFT_LIVE_EVENTS.state, wordcraftSnapshotFor(session, username, myScore(game, username)));
}

export function registerWordcraftClassroomHandlers(io: Server, socket: Socket): void {
  socket.on(WORDCRAFT_LIVE_EVENTS.place, (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;
    const ctx = raceForSocket(socket);
    if (!ctx) return;
    if (ctx.game.gameState !== 'in-progress') return;

    const parsed = placeSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(WORDCRAFT_LIVE_EVENTS.placeResult, {
        accepted: false,
        error: 'BAD_PAYLOAD',
      } satisfies WordcraftLivePlaceResult);
      return;
    }

    const username = getUsernameBySocketId(socket.id);
    if (!username) return;
    // A student who joined mid-round and places before ever pulling state
    // still needs a seat — same late-join rule as requestState below.
    ensureWordcraftPlayer(ctx.session, username);

    const result = applyWordcraftMove(
      ctx.session,
      username,
      parsed.data.placements as PlacedTile[],
      dictionaryFor(ctx.game.language ?? 'en', ctx.session.targets),
    );

    if (!result.ok) {
      socket.emit(WORDCRAFT_LIVE_EVENTS.placeResult, {
        accepted: false,
        error: result.error,
        invalidWord: result.invalidWord,
      } satisfies WordcraftLivePlaceResult);
      return;
    }

    // Fold the move into the room's shared aggregates. Per-word scores go to
    // playerWordDetails (the end-of-round recompute sums THESE); the running
    // total takes the full move; the bingo bonus rides the event-bonus
    // accumulator because it belongs to no single word. Three writes, one
    // total — the podium and the in-game leaderboard can never disagree.
    const game = ctx.game as never as Parameters<typeof addPlayerWord>[0];
    for (const w of result.words) {
      addPlayerWord(game, username, w.word.toLowerCase(), {
        validated: true,
        autoValidated: true,
        score: w.score,
      });
    }
    updatePlayerScore(game, username, result.score, true);
    if (result.bingoBonus > 0) {
      addPlayerEventBonus(game, username, result.bingoBonus);
    }

    socket.emit(WORDCRAFT_LIVE_EVENTS.placeResult, {
      accepted: true,
      words: result.words,
      score: result.score,
      bingo: result.bingo,
      bot: result.bot,
      botScore: ctx.session.players[username]?.botScore ?? 0,
    } satisfies WordcraftLivePlaceResult);
    emitPersonalState(socket, ctx.game, ctx.session, username);

    // The projector's live beat — and when the move built a LESSON word, that
    // is the beat the teacher bought the mode for.
    const lessonWord =
      result.words.find((w) => ctx.session.targets.includes(w.word.toUpperCase()))?.word ?? null;
    const activity: WordcraftLiveActivity = {
      username,
      words: result.words,
      score: result.score,
      bingo: result.bingo,
      lessonWord,
    };
    broadcastToRoom(io, getGameRoom(ctx.gameCode), WORDCRAFT_LIVE_EVENTS.activity, activity);

    const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
    getLeaderboardThrottled(ctx.game as never as ScoreGameBase, ctx.gameCode, (leaderboard: LeaderboardPlayer[]) => {
      broadcastToRoom(io, getGameRoom(ctx.gameCode), 'updateLeaderboard', { leaderboard });
    }, lbThrottleMs);
  });

  socket.on(WORDCRAFT_LIVE_EVENTS.requestState, () => {
    if (!checkRateLimit(socket.id)) return;
    const ctx = raceForSocket(socket);
    if (!ctx) return;
    const username = getUsernameBySocketId(socket.id);
    if (!username) return;
    // A late joiner gets a fresh seat; a reconnecting student gets their OWN
    // seat back — `ensureWordcraftPlayer` is the difference, and it is the
    // reconnect-equals-join rule (pitfall class 3) for this mode.
    ensureWordcraftPlayer(ctx.session, username);
    emitPersonalState(socket, ctx.game, ctx.session, username);
  });

  socket.on(WORDCRAFT_LIVE_EVENTS.projectorState, () => {
    if (!checkRateLimit(socket.id)) return;
    const ctx = raceForSocket(socket);
    if (!ctx) return;
    // The projector is a SPECTATOR: the checklist comes from the dealt
    // session and no seat is created — `ensureWordcraftPlayer` here would
    // deal the teacher's screen a board and poison the class race.
    const progress = wordcraftTargetsProgress(ctx.session);
    socket.emit(WORDCRAFT_LIVE_EVENTS.projectorState, {
      gameCode: ctx.gameCode,
      boardSize: ctx.session.boardSize,
      targets: progress.map((p) => ({ word: p.target, built: p.builtBy.length > 0 })),
    } satisfies WordcraftLiveProjectorState);
  });
}

export default registerWordcraftClassroomHandlers;
