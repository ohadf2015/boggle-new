import { vi } from 'vitest';
import {
  registerPartyHandlers,
  partyRooms,
  getRoom,
  getPublicRoomState,
} from '../partyHandler';
import { canAccessFeature } from '../../utils/featureFlags';
import { makeBotPlayers, startPartyBotDriver } from '../../modules/party/partyBots';
import { initCaptionClash, resendCaptionState } from '../../modules/party/captionClashEngine';
import { initPixelClash, resendPixelState } from '../../modules/party/pixelClashEngine';
import { resendShadowState } from '../../modules/party/shadowClashEngine';

// Mock all party-engine modules so tests don't depend on engine internals.
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));
vi.mock('../../utils/featureFlags', () => ({
  canAccessFeature: vi.fn(async () => true),
}));
vi.mock('../../modules/party/captionClashEngine', () => ({
  initCaptionClash: vi.fn(),
  startCaptionRound: vi.fn(),
  submitCaption: vi.fn(),
  submitLaugh: vi.fn(),
  submitVote: vi.fn(),
  cleanupCaptionClash: vi.fn(),
  resendCaptionState: vi.fn(),
}));
vi.mock('../../modules/party/pixelClashEngine', () => ({
  initPixelClash: vi.fn(),
  startPixelRound: vi.fn(),
  submitTelephonePrompt: vi.fn(),
  submitTelephoneStep: vi.fn(),
  submitShowdownCanvas: vi.fn(),
  submitShowdownVote: vi.fn(),
  handleRelayLiveStroke: vi.fn(),
  submitRelayArtistDrawing: vi.fn(),
  submitRelayBuilderDrawing: vi.fn(),
  cleanupPixelClash: vi.fn(),
  resendPixelState: vi.fn(),
}));
vi.mock('../../modules/party/shadowClashEngine', () => ({
  initShadowClash: vi.fn(),
  startShadowClash: vi.fn(),
  submitNightAction: vi.fn(),
  submitVote: vi.fn(),
  callVoteEarly: vi.fn(),
  cleanupShadowClash: vi.fn(),
  resendShadowState: vi.fn(),
}));
vi.mock('../../modules/party/partyBots', () => ({
  makeBotPlayers: vi.fn((n: number) =>
    Array.from({ length: n }, (_, i) => ({ socketId: `bot_${i}`, username: `Bot${i}`, isHost: false, isBot: true })),
  ),
  SOLO_FILL_TARGET: { 'caption-clash': 4, 'pixel-clash': 4, 'shadow-clash': 6 },
  startPartyBotDriver: vi.fn(),
  stopPartyBotDriver: vi.fn(),
}));

function createMockSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  const socket: any = {
    id,
    data: {},
    handshake: { auth: {} },
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  };
  return { socket, handlers };
}

function createMockIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as any, to, emit };
}

describe('partyHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset shared in-memory state between tests
    partyRooms.clear();
    process.env.NODE_ENV = 'test'; // disable dev bypass paths
    // Default: feature access granted (host/admin). Restored each test because
    // clearAllMocks() resets call history but NOT implementations.
    vi.mocked(canAccessFeature).mockResolvedValue(true);
  });

  it('registers core party events', () => {
    const { socket } = createMockSocket();
    const { io } = createMockIo();
    registerPartyHandlers(io, socket);
    expect(socket.on).toHaveBeenCalledWith('party:create', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('party:join', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('party:leave', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('party:startGame', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('party:input', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  describe('party:create', () => {
    it('rejects unknown gameId', async () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);

      await handlers['party:create']({
        gameId: 'not-a-real-game',
        roomName: 'Bad Room',
        username: 'Host',
        avatar: {},
      });

      expect(socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'INVALID_DATA',
      }));
    });

    it('rejects malformed payload', async () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);

      await handlers['party:create']({ gameId: 'caption-clash' }); // missing fields

      expect(socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'INVALID_DATA',
      }));
    });

    it('creates a room with host player on valid input', async () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);

      await handlers['party:create']({
        gameId: 'caption-clash',
        roomName: 'Lex Lounge',
        username: 'Host',
        avatar: { color: 'pink' },
      });

      // Find created room
      expect(partyRooms.size).toBe(1);
      const [room] = Array.from(partyRooms.values());
      expect(room.gameId).toBe('caption-clash');
      expect(room.hostSocketId).toBe('socket-host');
      expect(room.players[socket.id]).toBeDefined();
      expect(room.phase).toBe('lobby');

      expect(socket.emit).toHaveBeenCalledWith('party:joined', expect.objectContaining({
        playerId: 'socket-host',
      }));
    });

    it('rejects room creation when feature access is denied (admins-only host gate)', async () => {
      vi.mocked(canAccessFeature).mockResolvedValue(false);
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);

      await handlers['party:create']({
        gameId: 'caption-clash',
        roomName: 'Locked',
        username: 'NonAdmin',
        avatar: {},
      });

      expect(socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'NO_ACCESS',
      }));
      expect(partyRooms.size).toBe(0);
    });
  });

  describe('party:startGame', () => {
    async function createRoom(gameId: 'caption-clash' | 'pixel-clash' | 'shadow-clash' = 'caption-clash') {
      const { socket, handlers } = createMockSocket();
      const { io, to } = createMockIo();
      registerPartyHandlers(io, socket);
      await handlers['party:create']({
        gameId,
        roomName: 'Test',
        username: 'Host',
        avatar: {},
      });
      return { socket, handlers, io, to };
    }

    it('rejects when sender is not host', async () => {
      const host = await createRoom();
      const room = Array.from(partyRooms.values())[0];

      // A different socket tries to start
      const guest = createMockSocket('socket-guest');
      const guestIo = createMockIo();
      registerPartyHandlers(guestIo.io, guest.socket);

      // Manually inject guest as a player so getPlayerRoom() finds the room
      room.players['socket-guest'] = {
        socketId: 'socket-guest',
        username: 'Guest',
        avatar: {},
        authUserId: null,
        score: 0,
        isHost: false,
        isSpectator: false,
        connected: true,
      };

      guest.handlers['party:startGame']();

      expect(guest.socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'NOT_HOST',
      }));
    });

    it('rejects when not enough players (caption-clash needs 3)', async () => {
      const { socket, handlers } = await createRoom('caption-clash');

      handlers['party:startGame']();

      expect(socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'NOT_ENOUGH_PLAYERS',
      }));
    });

    it('rejects when phase is not lobby', async () => {
      const { socket, handlers } = await createRoom();
      const room = Array.from(partyRooms.values())[0];
      room.phase = 'playing';

      handlers['party:startGame']();

      expect(socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'ALREADY_STARTED',
      }));
    });
  });

  describe('getPublicRoomState — secret stripping', () => {
    it('strips shadow-clash roles and nightActions before broadcast', () => {
      const room: any = {
        roomCode: 'TEST1',
        gameId: 'shadow-clash',
        phase: 'playing',
        gameState: {
          type: 'shadow-clash',
          roles: { 'p1': 'wolf', 'p2': 'villager' }, // SECRET
          nightActions: { 'p1': { target: 'p2' } }, // SECRET
          publicLog: ['someone died'],
        },
      };

      const publicState = getPublicRoomState(room);

      expect((publicState.gameState as any).roles).toBeUndefined();
      expect((publicState.gameState as any).nightActions).toBeUndefined();
      expect((publicState.gameState as any).publicLog).toEqual(['someone died']);
      expect((publicState.gameState as any).type).toBe('shadow-clash');
    });

    it('does not strip non-shadow-clash gameState', () => {
      const room: any = {
        roomCode: 'TEST2',
        gameId: 'caption-clash',
        phase: 'voting',
        gameState: {
          type: 'caption-clash',
          submissions: [{ text: 'funny' }],
        },
      };

      const publicState = getPublicRoomState(room);
      expect((publicState.gameState as any).submissions).toEqual([{ text: 'funny' }]);
    });

    it('preserves null gameState (lobby phase)', () => {
      const room: any = {
        roomCode: 'TEST3',
        gameId: 'shadow-clash',
        phase: 'lobby',
        gameState: null,
      };

      const publicState = getPublicRoomState(room);
      expect(publicState.gameState).toBeNull();
    });
  });

  describe('party:join', () => {
    it('rejects when room not found', async () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);

      await handlers['party:join']({
        roomCode: 'NONE',
        username: 'Guest',
        avatar: {},
      });

      expect(socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'ROOM_NOT_FOUND',
      }));
    });

    it('forces spectator mode when room is full', async () => {
      const { socket: hostSock, handlers: hostHandlers } = createMockSocket('host');
      const { io } = createMockIo();
      registerPartyHandlers(io, hostSock);
      await hostHandlers['party:create']({
        gameId: 'caption-clash',
        roomName: 'Full',
        username: 'Host',
        avatar: {},
      });
      const room = Array.from(partyRooms.values())[0];
      // Stuff the room to capacity
      const cap = room.settings.maxPlayers;
      for (let i = 1; i < cap; i++) {
        room.players[`bot-${i}`] = {
          socketId: `bot-${i}`, username: `Bot${i}`, avatar: {},
          authUserId: null, score: 0, isHost: false, isSpectator: false, connected: true,
        };
      }

      const guest = createMockSocket('socket-guest');
      registerPartyHandlers(io, guest.socket);

      await guest.handlers['party:join']({
        roomCode: room.roomCode,
        username: 'Late',
        avatar: {},
      });

      expect(room.spectators['socket-guest']).toBeDefined();
      expect(room.players['socket-guest']).toBeUndefined();
    });

    it('admits an invited non-admin player even when feature access is denied (room code is the capability)', async () => {
      // Host (admin) creates the room — has feature access.
      const { socket: hostSock, handlers: hostHandlers } = createMockSocket('host');
      const { io } = createMockIo();
      registerPartyHandlers(io, hostSock);
      await hostHandlers['party:create']({
        gameId: 'caption-clash',
        roomName: 'Open',
        username: 'Host',
        avatar: {},
      });
      const room = Array.from(partyRooms.values())[0];

      // The invited friend is NOT an admin → feature flag denies access.
      vi.mocked(canAccessFeature).mockResolvedValue(false);
      const guest = createMockSocket('socket-guest');
      registerPartyHandlers(io, guest.socket);

      await guest.handlers['party:join']({
        roomCode: room.roomCode,
        username: 'Friend',
        avatar: {},
      });

      // Possessing a valid room code is enough — must NOT be blocked with NO_ACCESS.
      expect(guest.socket.emit).not.toHaveBeenCalledWith('party:error', expect.objectContaining({
        error: 'NO_ACCESS',
      }));
      expect(room.players['socket-guest']).toBeDefined();
      expect(guest.socket.emit).toHaveBeenCalledWith('party:joined', expect.any(Object));
    });
  });

  describe('getRoom', () => {
    it('returns room by code (case-insensitive lookup)', async () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);
      await handlers['party:create']({
        gameId: 'caption-clash',
        roomName: 'X', username: 'H', avatar: {},
      });
      const code = Array.from(partyRooms.keys())[0];

      expect(getRoom(code)).toBeDefined();
      expect(getRoom(code.toLowerCase())).toBeDefined();
    });

    it('returns undefined for unknown code', () => {
      expect(getRoom('NOPE')).toBeUndefined();
    });
  });

  describe('party:addBots (solo)', () => {
    async function hostRoom(gameId: 'caption-clash' | 'pixel-clash' | 'shadow-clash' = 'caption-clash') {
      const { socket, handlers } = createMockSocket('host');
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);
      await handlers['party:create']({ gameId, roomName: 'Solo', username: 'Host', avatar: {} });
      return { socket, handlers, io, room: Array.from(partyRooms.values())[0] };
    }

    it('rejects addBots from a non-host', async () => {
      const { room, io } = await hostRoom();
      const guest = createMockSocket('socket-guest');
      registerPartyHandlers(io, guest.socket);
      room.players['socket-guest'] = {
        socketId: 'socket-guest', username: 'Guest', avatar: {},
        authUserId: null, score: 0, isHost: false, isSpectator: false, connected: true,
      };

      guest.handlers['party:addBots']();

      expect(guest.socket.emit).toHaveBeenCalledWith('party:error', expect.objectContaining({ error: 'NOT_HOST' }));
    });

    it('fills non-host participants up to the per-game target with isBot players', async () => {
      const { handlers, room } = await hostRoom('caption-clash');

      handlers['party:addBots']();

      const bots = Object.values(room.players).filter((p) => (p as { isBot?: boolean }).isBot);
      expect(bots).toHaveLength(4); // SOLO_FILL_TARGET caption = 4, host doesn't count
      expect(makeBotPlayers).toHaveBeenCalledWith(4);
      expect(room.settings.custom.solo).toBe(true);
    });

    it('excludes the host (TV) from the engine player map on start', async () => {
      const { handlers, room } = await hostRoom('caption-clash');
      handlers['party:addBots']();

      handlers['party:startGame']();

      const playersArg = vi.mocked(initCaptionClash).mock.calls[0]?.[1] as Map<string, string>;
      expect(playersArg.has('host')).toBe(false); // host is the TV, not a participant
      expect(playersArg.size).toBe(4); // the 4 bots
    });

    it('starts the bot driver with the bot ids on solo start', async () => {
      const { handlers } = await hostRoom('caption-clash');
      handlers['party:addBots']();

      handlers['party:startGame']();

      expect(startPartyBotDriver).toHaveBeenCalledTimes(1);
      const botIdsArg = vi.mocked(startPartyBotDriver).mock.calls[0]?.[3] as string[];
      expect(botIdsArg.length).toBe(4);
      expect(botIdsArg.every((id) => id.startsWith('bot_'))).toBe(true);
    });

    it('initialises pixel-clash solo in SHOWDOWN mode (bot-playable)', async () => {
      const { handlers } = await hostRoom('pixel-clash');
      handlers['party:addBots']();

      handlers['party:startGame']();

      expect(vi.mocked(initPixelClash).mock.calls[0]?.[2]).toBe('showdown');
    });
  });

  describe('party:requestState', () => {
    it('replays current caption state to the requesting socket (fixes round-1 stall)', async () => {
      const { socket, handlers } = createMockSocket('host');
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);
      await handlers['party:create']({ gameId: 'caption-clash', roomName: 'R', username: 'Host', avatar: {} });
      const room = Array.from(partyRooms.values())[0];

      handlers['party:requestState']();

      expect(resendCaptionState).toHaveBeenCalledWith(io, room.roomCode, 'host');
    });

    it('routes to the pixel + shadow resenders for those games', async () => {
      const px = createMockSocket('hostP');
      const { io: ioP } = createMockIo();
      registerPartyHandlers(ioP, px.socket);
      await px.handlers['party:create']({ gameId: 'pixel-clash', roomName: 'P', username: 'H', avatar: {} });
      const roomP = Array.from(partyRooms.values()).find((r) => r.gameId === 'pixel-clash')!;
      px.handlers['party:requestState']();
      expect(resendPixelState).toHaveBeenCalledWith(ioP, roomP.roomCode, 'hostP');

      const sh = createMockSocket('hostS');
      const { io: ioS } = createMockIo();
      registerPartyHandlers(ioS, sh.socket);
      await sh.handlers['party:create']({ gameId: 'shadow-clash', roomName: 'S', username: 'H', avatar: {} });
      const roomS = Array.from(partyRooms.values()).find((r) => r.gameId === 'shadow-clash')!;
      sh.handlers['party:requestState']();
      expect(resendShadowState).toHaveBeenCalledWith(ioS, roomS.roomCode, 'hostS');
    });

    it('is a no-op when the socket is not in a room', () => {
      const { socket, handlers } = createMockSocket('orphan');
      const { io } = createMockIo();
      registerPartyHandlers(io, socket);

      handlers['party:requestState']();

      expect(resendCaptionState).not.toHaveBeenCalled();
    });
  });
});
