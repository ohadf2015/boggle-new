import { vi, type Mock } from 'vitest';
import { registerLobbySettingsHandlers } from '../lobbySettingsHandler';
import { registerHostHandlers } from '../hostHandler';
import { getGame, getGameBySocketId } from '../../modules/gameStateManager';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));

const mockGetGame = getGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;

function createSocket(id: string) {
  const handlers: Record<string, (data?: unknown) => void> = {};
  return {
    socket: { id, on: vi.fn((e: string, h: (data?: unknown) => void) => { handlers[e] = h; }), emit: vi.fn() } as any,
    handlers,
  };
}

function createIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as any, to, emit };
}

const VALID = { gameCode: 'GAME1', mode: 'blast', timerSeconds: 90, difficulty: 'HARD', minWordLength: 3 };

describe('lobbySettingsHandler', () => {
  let game: any;

  beforeEach(() => {
    vi.clearAllMocks();
    game = { gameCode: 'GAME1', hostSocketId: 'host', gameState: 'waiting', users: {} };
    mockGetGame.mockImplementation((code: string) => (code === 'GAME1' ? game : undefined));
    mockGetGameBySocketId.mockReturnValue('GAME1');
  });

  it('is registered by the host handlers', () => {
    const { socket } = createSocket('host');
    registerHostHandlers(createIo().io, socket);
    expect(socket.on).toHaveBeenCalledWith('updateLobbySettings', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('requestLobbySettings', expect.any(Function));
  });

  it('broadcasts the host settings to the room', () => {
    const { io, to, emit } = createIo();
    const { socket, handlers } = createSocket('host');
    registerLobbySettingsHandlers(io, socket);
    handlers.updateLobbySettings(VALID);
    expect(to).toHaveBeenCalledWith('game:GAME1');
    expect(emit).toHaveBeenCalledWith('lobbySettings', {
      gameCode: 'GAME1', mode: 'blast', timerSeconds: 90, difficulty: 'HARD', minWordLength: 3,
    });
  });

  it('ignores a non-host sender', () => {
    const { io, emit } = createIo();
    const { socket, handlers } = createSocket('player');
    registerLobbySettingsHandlers(io, socket);
    handlers.updateLobbySettings(VALID);
    expect(emit).not.toHaveBeenCalled();
  });

  it('ignores changes once the round started', () => {
    game.gameState = 'playing';
    const { io, emit } = createIo();
    const { socket, handlers } = createSocket('host');
    registerLobbySettingsHandlers(io, socket);
    handlers.updateLobbySettings(VALID);
    expect(emit).not.toHaveBeenCalled();
  });

  it.each([
    { ...VALID, mode: 'chess' },
    { ...VALID, timerSeconds: 5 },
    { ...VALID, timerSeconds: 99999 },
    { ...VALID, difficulty: 'IMPOSSIBLE' },
    { ...VALID, minWordLength: 9 },
    { ...VALID, gameCode: 42 },
    null,
  ])('rejects an invalid payload %#', (payload) => {
    const { io, emit } = createIo();
    const { socket, handlers } = createSocket('host');
    registerLobbySettingsHandlers(io, socket);
    handlers.updateLobbySettings(payload);
    expect(emit).not.toHaveBeenCalled();
  });

  it('sends a late joiner the latest settings', () => {
    const { io } = createIo();
    const host = createSocket('host');
    registerLobbySettingsHandlers(io, host.socket);
    host.handlers.updateLobbySettings(VALID);
    host.handlers.updateLobbySettings({ ...VALID, mode: 'word-hunt', timerSeconds: 180 });

    const joiner = createSocket('late');
    registerLobbySettingsHandlers(io, joiner.socket);
    joiner.handlers.requestLobbySettings();
    expect(joiner.socket.emit).toHaveBeenCalledWith('lobbySettings', expect.objectContaining({ gameCode: 'GAME1', mode: 'word-hunt', timerSeconds: 180 }));
  });

  it('answers nothing before the host has sent settings', () => {
    const joiner = createSocket('late');
    registerLobbySettingsHandlers(createIo().io, joiner.socket);
    joiner.handlers.requestLobbySettings();
    expect(joiner.socket.emit).not.toHaveBeenCalled();
  });

  it('answers nothing once the round started', () => {
    const { io } = createIo();
    const host = createSocket('host');
    registerLobbySettingsHandlers(io, host.socket);
    host.handlers.updateLobbySettings(VALID);
    game.gameState = 'playing';
    const joiner = createSocket('late');
    registerLobbySettingsHandlers(io, joiner.socket);
    joiner.handlers.requestLobbySettings();
    expect(joiner.socket.emit).not.toHaveBeenCalled();
  });

  it('does not leak one room\'s settings into a new room object with the same code', () => {
    const { io } = createIo();
    const host = createSocket('host');
    registerLobbySettingsHandlers(io, host.socket);
    host.handlers.updateLobbySettings(VALID);
    game = { gameCode: 'GAME1', hostSocketId: 'host', gameState: 'waiting', users: {} };
    const joiner = createSocket('late');
    registerLobbySettingsHandlers(io, joiner.socket);
    joiner.handlers.requestLobbySettings();
    expect(joiner.socket.emit).not.toHaveBeenCalled();
  });
});
