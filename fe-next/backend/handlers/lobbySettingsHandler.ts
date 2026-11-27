/**
 * Lobby settings: the host's pre-game pick (mode, round length, board size, min
 * word length) relayed to joiners. Joiners pull a snapshot on mount/reconnect
 * (`requestLobbySettings`), so a late joiner sees the same pick as everyone else.
 * Between rounds only the next mode can change (`updateNextMode` / `requestNextMode`).
 */
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { getGame, getGameBySocketId } from '../modules/gameStateManager.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { getGameRoom } from '../utils/socketHelpers.js';

const LobbySettingsSchema = z.object({
  gameCode: z.string().min(1).max(32),
  mode: z.enum(['random', 'classic', 'blast', 'word-hunt', 'wheel-rush', 'word-tower', 'crossword', 'wordcraft']),
  timerSeconds: z.number().int().min(15).max(900),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  minWordLength: z.number().int().min(2).max(6),
}).strict();

export type LobbySettingsPayload = z.infer<typeof LobbySettingsSchema>;

const NextModeSchema = z.object({
  gameCode: z.string().min(1).max(32),
  mode: z.enum(['random', 'classic', 'blast', 'word-hunt', 'wheel-rush']),
}).strict();

type NextModePayload = z.infer<typeof NextModeSchema>;

const BETWEEN_ROUNDS = new Set(['finished', 'validating']);

// Keyed by the room object, so a deleted room's settings go with it.
const settingsByRoom = new WeakMap<object, LobbySettingsPayload>();
const nextModeByRoom = new WeakMap<object, NextModePayload>();

function registerLobbySettingsHandlers(io: Server, socket: Socket): void {
  socket.on('updateLobbySettings', (data: unknown) => {
    if (!checkRateLimit(socket.id, 3)) return;
    const parsed = LobbySettingsSchema.safeParse(data);
    if (!parsed.success) return;
    const game = getGame(parsed.data.gameCode);
    if (!game || game.hostSocketId !== socket.id || game.gameState !== 'waiting') return;

    settingsByRoom.set(game, parsed.data);
    io.to(getGameRoom(parsed.data.gameCode)).emit('lobbySettings', parsed.data);
  });

  socket.on('requestLobbySettings', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const game = gameCode ? getGame(gameCode) : undefined;
    if (!game || game.gameState !== 'waiting') return;
    const settings = settingsByRoom.get(game);
    if (settings) socket.emit('lobbySettings', settings);
  });

  socket.on('updateNextMode', (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;
    const parsed = NextModeSchema.safeParse(data);
    if (!parsed.success) return;
    const game = getGame(parsed.data.gameCode);
    if (!game || game.hostSocketId !== socket.id || !BETWEEN_ROUNDS.has(game.gameState)) return;

    nextModeByRoom.set(game, parsed.data);
    io.to(getGameRoom(parsed.data.gameCode)).emit('nextMode', parsed.data);
  });

  socket.on('requestNextMode', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const game = gameCode ? getGame(gameCode) : undefined;
    if (!game || !BETWEEN_ROUNDS.has(game.gameState)) return;
    const pick = nextModeByRoom.get(game);
    if (pick) socket.emit('nextMode', pick);
  });
}

export { registerLobbySettingsHandlers };
