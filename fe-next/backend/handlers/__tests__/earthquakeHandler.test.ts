import { vi, type Mock } from 'vitest';
import type { GameState } from '../../modules/gameState/types';

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  updateGame: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((gc: string) => `room:${gc}`),
}));

vi.mock('../../utils/gameUtils', () => ({
  generateRandomTable: vi.fn(() => [['A', 'B'], ['C', 'D']]),
}));

vi.mock('../../modules/wordValidator', () => ({
  makePositionsMap: vi.fn(() => ({})),
}));

vi.mock('../../utils/consts', () => ({
  DIFFICULTIES: { MEDIUM: { nameKey: 'medium', rows: 4, cols: 4 } },
}));

const { mockTimerManagerInstance } = vi.hoisted(() => ({
  mockTimerManagerInstance: {
    setTimeout: vi.fn(),
    clearTimersWithPrefix: vi.fn(),
  },
}));

vi.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: mockTimerManagerInstance,
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../events/gameCleanup', () => ({
  gameCleanupEmitter: { onGameEnd: vi.fn(), onGameReset: vi.fn() },
}));

import { registerEarthquakeHandlers, EARTHQUAKE_CONFIG } from '../earthquakeHandler';
import { getGame, getGameBySocketId, updateGame } from '../../modules/gameStateManager';
import { broadcastToRoom } from '../../utils/socketHelpers';

const mockGetGame = getGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockUpdateGame = updateGame as Mock;
const mockBroadcastToRoom = broadcastToRoom as Mock;

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    gameCode: 'ABCD',
    gameSessionId: 1,
    gameState: 'in-progress',
    gameMode: 'classic',
    hostSocketId: 'host-socket-id',
    letterGrid: [['A', 'B'], ['C', 'D']],
    goldenLetters: [],
    specialWords: [],
    ...overrides,
  } as unknown as GameState;
}

function createMockSocket(id = 'host-socket-id') {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    id,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
    _emit: (event: string, ...args: unknown[]) => handlers[event]?.(...args),
  };
}

describe('EARTHQUAKE_CONFIG durations (catalyst unification)', () => {
  it('uses the scaled-up multiplayer durations', () => {
    expect(EARTHQUAKE_CONFIG.warningDurationMs).toBe(3000);
    expect(EARTHQUAKE_CONFIG.shakeDurationMs).toBe(1500);
    expect(EARTHQUAKE_CONFIG.fireRoundDurationSeconds).toBe(23);
  });
});

describe('earthquakeHandler — mutual exclusion', () => {
  const io = {} as Parameters<typeof registerEarthquakeHandlers>[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT trigger earthquake if a round event is already active', () => {
    const socket = createMockSocket('host-socket-id');
    registerEarthquakeHandlers(io, socket as never);

    mockGetGameBySocketId.mockReturnValue('ABCD');
    mockGetGame.mockReturnValue(makeGame({ activeRoundEvent: 'blizzard' }));

    socket._emit('triggerEarthquake', { gameSessionId: '1' });

    expect(mockUpdateGame).not.toHaveBeenCalled();
    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });
});
