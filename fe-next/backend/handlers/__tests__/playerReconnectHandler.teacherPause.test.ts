/**
 * Teacher pause — the `join` reconnect path must carry the same pause fields
 * as the `requestGameState` recovery path (pitfall 3: asymmetric paths), so a
 * student who reconnects mid-pause lands on the pause either way.
 */
import { vi, type Mock } from 'vitest';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/timerManager', () => ({
  default: { clearTimer: vi.fn(), setTimeout: vi.fn(), hasTimer: vi.fn(() => false) },
  clearGameTimer: vi.fn(), hasGameTimer: vi.fn(() => false),
}));
vi.mock('../../utils/gameStateMachine');
vi.mock('../../modules/achievementManager', () => ({ ACHIEVEMENT_ICONS: {} }));
vi.mock('../../modules/tournamentManager', () => ({ getTournament: vi.fn(), isTournamentGame: vi.fn(() => false) }));
vi.mock('../../modules/botManager', () => ({ isBot: vi.fn(() => false), getGameBots: vi.fn(() => []) }));

import { getGameUsers, getLeaderboard } from '../../modules/gameStateManager';
import { getGameRoom } from '../../utils/socketHelpers';
import { isInProgress } from '../../utils/gameStateMachine';
import { handleReconnection } from '../playerReconnectHandler';

function makeGame(overrides: Record<string, any> = {}) {
  return {
    gameCode: 'CLS1', hostSocketId: 'socket-host', language: 'en', timerSeconds: 120, gameState: 'in-progress',
    gameMode: 'classic', letterGrid: [['A']], playerScores: {}, playerWords: {}, playerAchievements: {}, spectators: {},
    gameSessionId: 1, isClassroom: true,
    users: {
      Host: { socketId: 'socket-host', isHost: true, disconnected: false },
      Student: { socketId: 'socket-old', isHost: false, disconnected: true },
    },
    ...overrides,
  } as any;
}

describe('handleReconnection — teacher pause fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getGameRoom as Mock).mockReturnValue('game:CLS1');
    (getGameUsers as Mock).mockReturnValue([]);
    (getLeaderboard as Mock).mockReturnValue([]);
    (isInProgress as Mock).mockReturnValue(true);
  });

  it('carries isPaused=true and the frozen remainingTime when reconnecting mid-pause', () => {
    const socket = { id: 'socket-new', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;

    handleReconnection({} as any, socket, makeGame({ isPaused: true, remainingTime: 37 }), 'CLS1', 'Student');

    const [, payload] = socket.emit.mock.calls.find((c: any[]) => c[0] === 'startGame');
    expect(payload).toEqual(expect.objectContaining({ isPaused: true, remainingTime: 37, timerSeconds: 37 }));
  });

  it('carries isPaused=false for a running round', () => {
    const socket = { id: 'socket-new', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;

    handleReconnection({} as any, socket, makeGame({ remainingTime: 88 }), 'CLS1', 'Student');

    const [, payload] = socket.emit.mock.calls.find((c: any[]) => c[0] === 'startGame');
    expect(payload).toEqual(expect.objectContaining({ isPaused: false, remainingTime: 88 }));
  });
});
