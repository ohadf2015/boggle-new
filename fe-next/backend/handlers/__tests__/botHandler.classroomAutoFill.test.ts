import { vi, type Mock } from 'vitest';
import { registerBotHandlers } from '../botHandler';
import { getGame, getGameBySocketId } from '../../modules/gameStateManager';
import * as botManager from '../../modules/botManager';
import { isInProgress } from '../../utils/gameStateMachine';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/botManager');
vi.mock('../../utils/socketHelpers', () => ({ broadcastToRoom: vi.fn(), broadcastActiveRooms: vi.fn(), getGameRoom: (c: string) => `game:${c}` }));
vi.mock('../../utils/errorHandler', () => ({ emitError: vi.fn(), ErrorCodes: {} }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn((_s: unknown, d: unknown) => ({ success: true, data: d })),
  addBotSchema: {},
  removeBotSchema: {},
  setAutoFillSchema: {},
}));
vi.mock('../../utils/gameStateMachine');

function hostSocket() {
  const handlers: Record<string, (d: unknown) => void> = {};
  const socket = { id: 'socket-host', on: vi.fn((e: string, h: (d: unknown) => void) => { handlers[e] = h; }), emit: vi.fn() };
  return { socket, handlers };
}

function game(isClassroom: boolean) {
  return { gameCode: 'G1', hostSocketId: 'socket-host', gameState: 'waiting', language: 'en', isClassroom, users: { Host: { isHost: true } } };
}

describe('botHandler — classroom practice round fill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isInProgress as Mock).mockReturnValue(false);
    (getGameBySocketId as Mock).mockReturnValue('G1');
    (botManager.getGameBots as Mock).mockReturnValue([]);
    (botManager.addBot as Mock).mockImplementation(() => ({ id: `b${Math.random()}`, username: `Bot ${Math.random()}`, avatar: {} }));
  });

  it('Given a classroom room, When the teacher fills it with practice bots, Then no celebrity bots are allowed', () => {
    (getGame as Mock).mockReturnValue(game(true));
    const { socket, handlers } = hostSocket();
    registerBotHandlers({ to: () => ({ emit: vi.fn() }) } as never, socket as never);
    handlers.setAutoFill({ enabled: true, targetCount: 3 });
    const calls = (botManager.addBot as Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c[4]).toEqual({ celebrities: false });
  });

  it('Given a public room, When it auto-fills, Then celebrity bots stay allowed', () => {
    (getGame as Mock).mockReturnValue(game(false));
    const { socket, handlers } = hostSocket();
    registerBotHandlers({ to: () => ({ emit: vi.fn() }) } as never, socket as never);
    handlers.setAutoFill({ enabled: true, targetCount: 3 });
    for (const c of (botManager.addBot as Mock).mock.calls) expect(c[4]).toEqual({ celebrities: true });
  });
});
