/**
 * Word Pack Handler Tests
 * TDD: Tests written before implementation
 */

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
}));

vi.mock('../../modules/supabase/ugcPacks.js', () => ({
  getPackById: vi.fn(),
}));

vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

import { vi, type Mock, type MockInstance } from 'vitest';
import { registerWordPackHandler } from '../wordPackHandler';
import { getGame, getGameBySocketId } from '../../modules/gameStateManager.js';
import { getPackById } from '../../modules/supabase/ugcPacks.js';
import { broadcastToRoom } from '../../utils/socketHelpers.js';

const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetGame = getGame as Mock;
const mockGetPackById = getPackById as Mock;
const mockBroadcast = broadcastToRoom as Mock;

type MockSocket = {
  id: string;
  emit: Mock;
  on: (event: string, cb: Function) => void;
  _handlers: Record<string, Function>;
};

function makeSocket(): MockSocket {
  const _handlers: Record<string, Function> = {};
  return {
    id: 'socket-1',
    emit: vi.fn(),
    on: (event: string, cb: Function) => { _handlers[event] = cb; },
    _handlers,
  };
}

function makeGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'GAME01',
    hostSocketId: 'socket-1',
    gameState: 'waiting',
    selectedVocabulary: undefined as Set<string> | undefined,
    activeWordPack: undefined as Record<string, unknown> | undefined,
    ...overrides,
  };
}

function makePack(overrides: Record<string, unknown> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Ocean Words',
    theme_emoji: '🌊',
    word_count: 3,
    words: ['OCEAN', 'WAVE', 'SURF'],
    is_public: true,
    moderation_status: 'approved',
    ...overrides,
  };
}

describe('registerWordPackHandler', () => {
  let socket: MockSocket;
  let io: { to: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    socket = makeSocket();
    io = { to: vi.fn().mockReturnThis() };
  });

  it('fetches pack and sets game.selectedVocabulary on valid apply-word-pack', async () => {
    const game = makeGame();
    const pack = makePack();
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetGame.mockReturnValue(game);
    mockGetPackById.mockResolvedValue(pack);

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: pack.id });

    expect(mockGetPackById).toHaveBeenCalledWith(pack.id);
    expect(game.selectedVocabulary).toBeInstanceOf(Set);
    expect((game.selectedVocabulary as Set<string>).has('OCEAN')).toBe(true);
  });

  it('sets game.activeWordPack with pack metadata', async () => {
    const game = makeGame();
    const pack = makePack();
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetGame.mockReturnValue(game);
    mockGetPackById.mockResolvedValue(pack);

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: pack.id });

    expect(game.activeWordPack).toMatchObject({
      id: pack.id,
      name: pack.name,
      emoji: pack.theme_emoji,
      wordCount: pack.word_count,
    });
  });

  it('broadcasts word-pack-applied to room', async () => {
    const game = makeGame();
    const pack = makePack();
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetGame.mockReturnValue(game);
    mockGetPackById.mockResolvedValue(pack);

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: pack.id });

    expect(mockBroadcast).toHaveBeenCalledWith(
      io,
      game.gameCode,
      'word-pack-applied',
      expect.objectContaining({ id: pack.id, name: pack.name })
    );
  });

  it('rejects if game already started', async () => {
    const game = makeGame({ gameState: 'in-progress' });
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetGame.mockReturnValue(game);

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'GAME_ALREADY_STARTED' }));
    expect(mockGetPackById).not.toHaveBeenCalled();
  });

  it('rejects if not host', async () => {
    const game = makeGame({ hostSocketId: 'other-socket' });
    mockGetGame.mockReturnValue(game);
    // host check uses socket.id vs game.hostSocketId

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'NOT_HOST' }));
    expect(mockGetPackById).not.toHaveBeenCalled();
  });

  it('rejects invalid packId format (not a UUID)', async () => {
    const game = makeGame();
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetGame.mockReturnValue(game);

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: 'not-a-uuid' });

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'INVALID_PAYLOAD' }));
    expect(mockGetPackById).not.toHaveBeenCalled();
  });

  it('emits error when pack not found', async () => {
    const game = makeGame();
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetGame.mockReturnValue(game);
    mockGetPackById.mockResolvedValue(null);

    registerWordPackHandler(io as never, socket as never);
    await socket._handlers['apply-word-pack']({ packId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'PACK_NOT_FOUND' }));
  });
});
