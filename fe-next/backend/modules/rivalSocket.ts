// No gameStateManager import here: gameStateManager calls in, and the reverse import would be a cycle.
import type { Server } from 'socket.io';
import type { GameState } from './gameState/types.js';
import type { ClassroomGame } from './classroomGameManager.js';
import type { RivalView } from '@/shared/types/rivalry';
import { classroomTeamAbilities } from './classroomLevelCache.js';
import { getGameRoom } from '../utils/socketHelpers.js';
import {
  onPlayerLeft,
  onScoreChanged,
  resetRivalsForNewRound,
  rivalStartExtras,
  seatRivalPlayer,
  type RivalEmit,
  type RivalRoom,
} from './rivalPairs.js';

let rivalIo: Server | null = null;

export function setRivalIo(io: Server): void {
  rivalIo = io;
}

const asRoom = (game: GameState) => game as unknown as RivalRoom;

export function emitRivalEvents(io: Server | null, gameCode: string, game: GameState, events: RivalEmit[]): void {
  if (!io) return;
  for (const e of events) {
    if (e.kind === 'room') {
      io.to(getGameRoom(gameCode)).emit(e.event, e.payload);
      continue;
    }
    const socketId = game.users?.[e.username]?.socketId;
    if (socketId) io.to(socketId).emit(e.event, e.payload);
  }
}

export function startRivalRound(
  io: Server,
  gameCode: string,
  game: GameState,
  classroomGame: ClassroomGame | null,
  extras: Record<string, unknown>
): void {
  setRivalIo(io);
  const users = game.users ?? {};
  const abilities = classroomGame?.classroomId
    ? classroomTeamAbilities(classroomGame.classroomId, Object.keys(users).map((username) => ({
      username, authUserId: users[username]?.authUserId,
    })))
    : {};
  const teams = (extras.classroom as { teams?: Array<{ id: number; memberNames: string[] }> } | undefined)?.teams;
  const events = resetRivalsForNewRound(asRoom(game), {
    enabled: classroomGame ? classroomGame.settings?.rivalry : false,
    leaderboardHidden: game.classroomPressure?.leaderboard === 'hidden',
    mode: game.gameMode || 'classic',
    seed: `${gameCode}:${game.gameSessionId ?? 0}`,
    abilities,
    teams,
  });
  emitRivalEvents(io, gameCode, game, events);
}

export function notifyRivalScore(gameCode: string, game: GameState | undefined | null, username: string): void {
  if (!game?.users || !asRoom(game).rivalry?.enabled) return;
  emitRivalEvents(rivalIo, gameCode, game, onScoreChanged(asRoom(game), username));
}

// Real departures only (kick, grace expired, explicit leave), never a same-user session swap on rejoin.
export function notifyRivalLeft(gameCode: string, game: GameState | undefined | null, username: string): void {
  if (!game?.users || !asRoom(game).rivalry?.enabled) return;
  emitRivalEvents(rivalIo, gameCode, game, onPlayerLeft(asRoom(game), username));
}

export function rivalPayloadFor(gameCode: string, game: GameState, username: string): RivalView | null {
  if (!asRoom(game).rivalry?.enabled) return null;
  emitRivalEvents(rivalIo, gameCode, game, seatRivalPlayer(asRoom(game), username));
  return rivalStartExtras(asRoom(game), username);
}

export function rivalPayloadField(gameCode: string, game: GameState, username: string): { rival?: RivalView | null } {
  if (!asRoom(game).rivalry?.enabled) return {};
  return { rival: rivalPayloadFor(gameCode, game, username) };
}
