/**
 * Party Games Socket Handler
 * Manages party game rooms, phases, and input routing.
 * Game-specific logic lives in backend/modules/party/[gameId].ts
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { canAccessFeature } from '../utils/featureFlags.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';
import {
  initCaptionClash,
  startCaptionRound,
  submitCaption,
  submitLaugh,
  submitVote as submitCaptionVote,
  cleanupCaptionClash,
  resendCaptionState,
} from '../modules/party/captionClashEngine.js';
import {
  initPixelClash,
  startPixelRound,
  submitTelephonePrompt,
  submitTelephoneStep,
  submitShowdownCanvas,
  submitShowdownVote,
  handleRelayLiveStroke,
  submitRelayArtistDrawing,
  submitRelayBuilderDrawing,
  cleanupPixelClash,
  resendPixelState,
  type DrawingData,
} from '../modules/party/pixelClashEngine.js';
import {
  initShadowClash,
  startShadowClash,
  submitNightAction,
  submitVote as submitShadowVote,
  callVoteEarly,
  cleanupShadowClash,
  resendShadowState,
} from '../modules/party/shadowClashEngine.js';
import {
  makeBotPlayers,
  startPartyBotDriver,
  stopPartyBotDriver,
  SOLO_FILL_TARGET,
} from '../modules/party/partyBots.js';

// ==================== Types (inline to avoid rootDir issues) ====================

type PartyGameId = 'caption-clash' | 'pixel-clash' | 'shadow-clash';

type PartyPhase = 'lobby' | 'playing' | 'voting' | 'reveal' | 'results';

interface PartyPlayer {
  socketId: string;
  username: string;
  avatar: Record<string, unknown>;
  authUserId?: string | null;
  score: number;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  /** Solo-mode fill player driven server-side (no real socket). */
  isBot?: boolean;
}

interface PartyRoom {
  roomCode: string;
  roomName: string;
  gameId: PartyGameId;
  hostSocketId: string;
  players: Record<string, PartyPlayer>;
  spectators: Record<string, PartyPlayer>;
  phase: PartyPhase;
  round: number;
  totalRounds: number;
  settings: {
    maxPlayers: number;
    roundTimeSeconds: number;
    custom: Record<string, unknown>;
  };
  gameState: Record<string, unknown> | null;
  createdAt: number;
  lastActivity: number;
}

/** Inline game config */
const PARTY_GAME_CONFIG: Record<PartyGameId, { minPlayers: number; maxPlayers: number; defaultRounds: number; defaultRoundTime: number }> = {
  'caption-clash': { minPlayers: 3, maxPlayers: 10, defaultRounds: 7, defaultRoundTime: 45 },
  'pixel-clash': { minPlayers: 3, maxPlayers: 10, defaultRounds: 5, defaultRoundTime: 60 },
  'shadow-clash': { minPlayers: 5, maxPlayers: 10, defaultRounds: 4, defaultRoundTime: 180 },
};

const VALID_GAME_IDS = ['caption-clash', 'pixel-clash', 'shadow-clash'] as const;

// ==================== In-Memory State ====================

const partyRooms = new Map<string, PartyRoom>();

// ==================== Schemas ====================

const createSchema = z.object({
  gameId: z.enum(VALID_GAME_IDS),
  roomName: z.string().min(1).max(30),
  username: z.string().min(1).max(20),
  avatar: z.record(z.string(), z.unknown()),
});

const joinSchema = z.object({
  roomCode: z.string().min(4).max(10),
  username: z.string().min(1).max(20),
  avatar: z.record(z.string(), z.unknown()),
  asSpectator: z.boolean().optional(),
});

const inputSchema = z.object({
  gameId: z.enum(VALID_GAME_IDS),
  action: z.string(),
}).passthrough();

// ==================== Helpers ====================

// 6 chars to satisfy the shared GameCodeSchema (min 6) — keeps party codes
// aligned with main multiplayer so they never diverge or fail validation.
export const PARTY_ROOM_CODE_LENGTH = 6;

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < PARTY_ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getRoom(roomCode: string): PartyRoom | undefined {
  return partyRooms.get(roomCode.toUpperCase());
}

function getPlayerRoom(socketId: string): PartyRoom | undefined {
  for (const room of partyRooms.values()) {
    if (room.players[socketId] || room.spectators[socketId]) {
      return room;
    }
  }
  return undefined;
}

function broadcastToRoom(io: Server, roomCode: string, event: string, data: unknown): void {
  io.to(`party:${roomCode}`).emit(event, data);
}

function getPublicRoomState(room: PartyRoom): Record<string, unknown> {
  const { gameState, ...publicRoom } = room;
  // Strip secrets from shadow-clash game state before broadcasting
  if (gameState && (gameState as Record<string, unknown>).type === 'shadow-clash') {
    const { roles, nightActions, ...publicState } = gameState as Record<string, unknown>;
    return { ...publicRoom, gameState: publicState };
  }
  return { ...publicRoom, gameState };
}

// ==================== Room Lifecycle ====================

/** Minimal avatar for bot players. */
const BOT_AVATAR: Record<string, unknown> = { base: 'robot', baseColor: 'purple', expression: 'happy' };

/** Evict server-driven bot players so the room can auto-clean once the human leaves. */
function removeBotsFromRoom(roomCode: string): void {
  const room = partyRooms.get(roomCode);
  if (!room) return;
  for (const id of Object.keys(room.players)) {
    if (room.players[id].isBot) delete room.players[id];
  }
}

function cleanupRoom(roomCode: string, io?: Server): void {
  stopPartyBotDriver(roomCode);
  const room = partyRooms.get(roomCode);
  if (room?.gameId === 'caption-clash') {
    cleanupCaptionClash(roomCode);
  } else if (room?.gameId === 'pixel-clash') {
    cleanupPixelClash(roomCode);
  } else if (room?.gameId === 'shadow-clash') {
    cleanupShadowClash(roomCode);
  }
  // Evict any still-attached sockets from the socket.io room so the adapter
  // doesn't retain dead subscriptions. handlePlayerLeave normally handles this
  // per-player, but the 30-min stale-room sweep below can fire while sockets
  // are still attached.
  if (io) {
    io.in(`party:${roomCode}`).socketsLeave(`party:${roomCode}`);
  }
  partyRooms.delete(roomCode);
  logger.info('PARTY', `Room ${roomCode} cleaned up`);
}

// Auto-cleanup stale rooms (no activity for 30 min). Interval starts on first
// handler registration so we have an io reference for socket eviction.
let staleSweepInterval: NodeJS.Timeout | null = null;
function startStaleSweep(io: Server): void {
  if (staleSweepInterval) return;
  staleSweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of partyRooms.entries()) {
      if (now - room.lastActivity > 30 * 60 * 1000) {
        cleanupRoom(code, io);
      }
    }
  }, 5 * 60 * 1000);
  // Don't keep the event loop alive in test runners
  if (typeof staleSweepInterval.unref === 'function') {
    staleSweepInterval.unref();
  }
}

// ==================== Handler Registration ====================

export function registerPartyHandlers(io: Server, socket: Socket): void {
  // Start the stale-room sweep on first registration (idempotent guard inside).
  startStaleSweep(io);

  // ---- Create Room ----
  socket.on('party:create', async (data: unknown) => {
    // Heavy weight: room creation allocates state + scheduled cleanup
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('party:error', { error: 'RATE_LIMITED', message: 'Slow down' });
      return;
    }
    try {
      const parsed = createSchema.parse(data);
      const gameDef = PARTY_GAME_CONFIG[parsed.gameId];

      // Feature flag gate (bypass in development)
      const authUserId = (socket.data?.verifiedUserId as string) ||
        (socket.handshake.auth as Record<string, unknown>)?.userId as string | undefined;
      const isDev = process.env.NODE_ENV === 'development';
      const hasAccess = isDev || await canAccessFeature(authUserId || null, 'party_games_alpha');
      if (!hasAccess) {
        socket.emit('party:error', { error: 'NO_ACCESS', message: 'Party games not available' });
        return;
      }

      let roomCode = generateRoomCode();
      while (partyRooms.has(roomCode)) {
        roomCode = generateRoomCode();
      }

      const player: PartyPlayer = {
        socketId: socket.id,
        username: parsed.username,
        avatar: parsed.avatar,
        authUserId: authUserId || null,
        score: 0,
        isHost: true,
        isSpectator: false,
        connected: true,
      };

      const room: PartyRoom = {
        roomCode,
        roomName: parsed.roomName,
        gameId: parsed.gameId,
        hostSocketId: socket.id,
        players: { [socket.id]: player },
        spectators: {},
        phase: 'lobby',
        round: 0,
        totalRounds: gameDef.defaultRounds,
        settings: {
          maxPlayers: gameDef.maxPlayers,
          roundTimeSeconds: gameDef.defaultRoundTime,
          custom: {},
        },
        gameState: null,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      partyRooms.set(roomCode, room);
      socket.join(`party:${roomCode}`);

      socket.emit('party:joined', {
        room: getPublicRoomState(room),
        playerId: socket.id,
      });

      logger.info('PARTY', `Room ${roomCode} created by ${parsed.username} for ${parsed.gameId}`);
    } catch (err) {
      logger.info('PARTY', `Create error: ${err}`);
      socket.emit('party:error', { error: 'INVALID_DATA', message: 'Invalid room data' });
    }
  });

  // ---- Join Room ----
  socket.on('party:join', async (data: unknown) => {
    if (!checkRateLimit(socket.id, 3)) {
      socket.emit('party:error', { error: 'RATE_LIMITED', message: 'Slow down' });
      return;
    }
    try {
      const parsed = joinSchema.parse(data);
      const room = getRoom(parsed.roomCode);
      if (!room) {
        socket.emit('party:error', { error: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Join is gated by possession of a valid room code, NOT the feature flag.
      // The room can only exist because an admin/host passed the create gate to make
      // it, so the code itself is the capability. This lets invited non-admin players
      // (3–5 needed per game) join an admin's playtest room — the feature stays
      // "admins only" at the creation boundary while remaining actually playable.
      const authUserId = (socket.data?.verifiedUserId as string) ||
        (socket.handshake.auth as Record<string, unknown>)?.userId as string | undefined;

      const playerCount = Object.keys(room.players).length;
      const isSpectator = parsed.asSpectator || room.phase !== 'lobby' || playerCount >= room.settings.maxPlayers;

      const player: PartyPlayer = {
        socketId: socket.id,
        username: parsed.username,
        avatar: parsed.avatar,
        authUserId: authUserId || null,
        score: 0,
        isHost: false,
        isSpectator,
        connected: true,
      };

      if (isSpectator) {
        room.spectators[socket.id] = player;
      } else {
        room.players[socket.id] = player;
      }
      room.lastActivity = Date.now();

      socket.join(`party:${room.roomCode}`);
      socket.emit('party:joined', {
        room: getPublicRoomState(room),
        playerId: socket.id,
      });

      broadcastToRoom(io, room.roomCode, 'party:playerJoined', { player });
      logger.info('PARTY', `${parsed.username} joined ${room.roomCode} as ${isSpectator ? 'spectator' : 'player'}`);
    } catch (err) {
      logger.info('PARTY', `Join error: ${err}`);
      socket.emit('party:error', { error: 'INVALID_DATA', message: 'Invalid join data' });
    }
  });

  // ---- Leave Room ----
  socket.on('party:leave', () => {
    handlePlayerLeave(io, socket);
  });

  // ---- Add Bots (solo play) ----
  // Host-only. Fills the empty seats with server-driven bot players so one human
  // can play. Two-surface model: host = TV, human joins on a phone, bots fill.
  socket.on('party:addBots', () => {
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('party:error', { error: 'RATE_LIMITED', message: 'Slow down' });
      return;
    }
    const room = getPlayerRoom(socket.id);
    if (!room) return;
    if (room.hostSocketId !== socket.id) {
      socket.emit('party:error', { error: 'NOT_HOST', message: 'Only host can add bots' });
      return;
    }
    if (room.phase !== 'lobby') {
      socket.emit('party:error', { error: 'ALREADY_STARTED', message: 'Game already in progress' });
      return;
    }

    const target = SOLO_FILL_TARGET[room.gameId];
    const nonHostCount = Object.values(room.players).filter((p) => !p.isHost).length;
    const capacityLeft = room.settings.maxPlayers - Object.keys(room.players).length;
    const need = Math.max(0, Math.min(target - nonHostCount, capacityLeft));

    for (const b of makeBotPlayers(need)) {
      const player: PartyPlayer = {
        socketId: b.socketId,
        username: b.username,
        avatar: BOT_AVATAR,
        authUserId: null,
        score: 0,
        isHost: false,
        isSpectator: false,
        connected: true,
        isBot: true,
      };
      room.players[b.socketId] = player;
      broadcastToRoom(io, room.roomCode, 'party:playerJoined', { player });
    }

    room.settings.custom.solo = true;
    room.lastActivity = Date.now();
    broadcastToRoom(io, room.roomCode, 'party:gameUpdate', getPublicRoomState(room));
  });

  // ---- Request Current State (state-on-demand) ----
  // A game view mounting on the start transition can miss one-shot phase events
  // (e.g. caption imageReady). The view requests state on mount and we replay
  // the current view to just that socket. No-op if not in a room.
  socket.on('party:requestState', () => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;
    if (room.gameId === 'caption-clash') {
      resendCaptionState(io, room.roomCode, socket.id);
    } else if (room.gameId === 'pixel-clash') {
      resendPixelState(io, room.roomCode, socket.id);
    } else if (room.gameId === 'shadow-clash') {
      resendShadowState(io, room.roomCode, socket.id);
    }
  });

  // ---- Start Game ----
  socket.on('party:startGame', () => {
    if (!checkRateLimit(socket.id, 3)) {
      socket.emit('party:error', { error: 'RATE_LIMITED', message: 'Slow down' });
      return;
    }
    const room = getPlayerRoom(socket.id);
    if (!room) return;
    if (room.hostSocketId !== socket.id) {
      socket.emit('party:error', { error: 'NOT_HOST', message: 'Only host can start' });
      return;
    }
    if (room.phase !== 'lobby') {
      socket.emit('party:error', { error: 'ALREADY_STARTED', message: 'Game already in progress' });
      return;
    }

    // The host is the TV screen, not a participant — count & seed the engine from
    // the non-host players only (fixes phantom-player stalls; enables solo bots).
    const participants = Object.values(room.players).filter((p) => !p.isHost);
    const gameDef = PARTY_GAME_CONFIG[room.gameId];
    const isDev = process.env.NODE_ENV === 'development';
    const minRequired = isDev ? 1 : gameDef.minPlayers;
    if (participants.length < minRequired) {
      socket.emit('party:error', {
        error: 'NOT_ENOUGH_PLAYERS',
        message: `Need at least ${gameDef.minPlayers} players`,
      });
      return;
    }

    room.phase = 'playing';
    room.round = 1;
    room.lastActivity = Date.now();

    const players = new Map<string, string>();
    for (const p of participants) players.set(p.socketId, p.username);
    const isSolo = room.settings.custom.solo === true;

    // Initialize game-specific engine
    if (room.gameId === 'caption-clash') {
      initCaptionClash(room.roomCode, players, room.totalRounds);
      startCaptionRound(io, room.roomCode);
    } else if (room.gameId === 'pixel-clash') {
      // Solo rotates showdown → telephone → relay per round (bots play all three);
      // multiplayer keeps the default telephone mode.
      initPixelClash(room.roomCode, players, isSolo ? 'showdown' : 'telephone', room.totalRounds, isSolo);
      startPixelRound(io, room.roomCode);
    } else if (room.gameId === 'shadow-clash') {
      initShadowClash(room.roomCode, players, 'standard', room.totalRounds);
      startShadowClash(io, room.roomCode);
    }

    // Solo: spin up the server-side bot driver to play the fill seats.
    const botIds = participants.filter((p) => p.isBot).map((p) => p.socketId);
    if (botIds.length > 0) {
      startPartyBotDriver(io, room.roomCode, room.gameId, botIds, () => Date.now(), () => {
        removeBotsFromRoom(room.roomCode);
      });
    }

    broadcastToRoom(io, room.roomCode, 'party:phaseChange', {
      phase: room.phase,
      gameState: getPublicRoomState(room).gameState,
    });

    logger.info('PARTY', `Game started in ${room.roomCode}: ${room.gameId}`);
  });

  // ---- Player Input ----
  socket.on('party:input', (data: unknown) => {
    // Light weight (1) — pixel-clash live-stroke is high-frequency by design.
    // Default budget (50/10s) absorbs ~5 strokes/sec which matches drawing UX.
    if (!checkRateLimit(socket.id)) {
      // No error emit — silent drop avoids spamming clients during draw bursts
      return;
    }
    try {
      const parsed = inputSchema.parse(data);
      const room = getPlayerRoom(socket.id);
      if (!room) return;
      if (room.phase === 'lobby' || room.phase === 'results') return;

      room.lastActivity = Date.now();

      // Route to game-specific handler
      if (room.gameId === 'pixel-clash') {
        const action = parsed.action as string;
        if (action === 'submit-prompt' && 'text' in parsed) {
          submitTelephonePrompt(io, room.roomCode, socket.id, parsed.text as string);
        } else if (action === 'draw' && 'strokes' in parsed) {
          const strokes = parsed.strokes as DrawingData;
          if ('chainId' in parsed) {
            submitTelephoneStep(io, room.roomCode, socket.id, parsed.chainId as string, strokes);
          } else if ('isRelay' in parsed && parsed.isRelay) {
            if ('isBuilder' in parsed && parsed.isBuilder) {
              submitRelayBuilderDrawing(io, room.roomCode, socket.id, strokes);
            } else {
              submitRelayArtistDrawing(io, room.roomCode, socket.id, strokes);
            }
          } else {
            submitShowdownCanvas(io, room.roomCode, socket.id, strokes);
          }
        } else if (action === 'live-stroke' && 'paths' in parsed) {
          handleRelayLiveStroke(io, room.roomCode, socket.id, parsed.paths as DrawingData);
        } else if (action === 'guess' && 'text' in parsed && 'chainId' in parsed) {
          submitTelephoneStep(io, room.roomCode, socket.id, parsed.chainId as string, parsed.text as string);
        } else if (action === 'vote' && 'best' in parsed && 'funniest' in parsed) {
          submitShowdownVote(room.roomCode, socket.id, parsed.best as string, parsed.funniest as string);
        }
      } else if (room.gameId === 'shadow-clash') {
        const action = parsed.action as string;
        if (action === 'night-action' && 'targetUsername' in parsed) {
          submitNightAction(io, room.roomCode, socket.id, parsed.targetUsername as string);
        } else if (action === 'vote' && 'targetUsername' in parsed) {
          submitShadowVote(io, room.roomCode, socket.id, parsed.targetUsername as string);
        } else if (action === 'call-vote') {
          callVoteEarly(io, room.roomCode, socket.id);
        }
      } else if (room.gameId === 'caption-clash') {
        const action = parsed.action as string;
        if (action === 'submit-caption' && 'text' in parsed) {
          submitCaption(io, room.roomCode, socket.id, parsed.text as string);
        } else if (action === 'vote' && 'submissionId' in parsed) {
          submitCaptionVote(io, room.roomCode, socket.id, parsed.submissionId as string);
        } else if (action === 'laugh' && 'submissionId' in parsed) {
          submitLaugh(room.roomCode, parsed.submissionId as string, io);
        }
      }
      logger.info('PARTY', `Input from ${socket.id} in ${room.roomCode}: ${parsed.action}`);
    } catch (err) {
      logger.info('PARTY', `Input error: ${err}`);
    }
  });

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    handlePlayerLeave(io, socket);
  });
}

function handlePlayerLeave(io: Server, socket: Socket): void {
  const room = getPlayerRoom(socket.id);
  if (!room) return;

  const player = room.players[socket.id] || room.spectators[socket.id];
  const username = player?.username || 'unknown';

  delete room.players[socket.id];
  delete room.spectators[socket.id];
  socket.leave(`party:${room.roomCode}`);

  broadcastToRoom(io, room.roomCode, 'party:playerLeft', {
    socketId: socket.id,
    username,
  });

  // Host transfer or room cleanup
  if (room.hostSocketId === socket.id) {
    const remainingPlayers = Object.values(room.players);
    if (remainingPlayers.length > 0) {
      const newHost = remainingPlayers[0];
      room.hostSocketId = newHost.socketId;
      newHost.isHost = true;
      broadcastToRoom(io, room.roomCode, 'party:gameUpdate', getPublicRoomState(room));
      logger.info('PARTY', `Host transferred to ${newHost.username} in ${room.roomCode}`);
    } else {
      cleanupRoom(room.roomCode, io);
    }
  }

  if (Object.keys(room.players).length === 0 && Object.keys(room.spectators).length === 0) {
    cleanupRoom(room.roomCode, io);
  }

  logger.info('PARTY', `${username} left ${room.roomCode}`);
}

// ==================== Exports for Game Modules ====================

export {
  partyRooms,
  getRoom,
  getPlayerRoom,
  broadcastToRoom,
  getPublicRoomState,
};

export type { PartyRoom, PartyPlayer, PartyGameId };
