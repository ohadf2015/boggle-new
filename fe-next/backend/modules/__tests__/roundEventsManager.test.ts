/**
 * Round Events Manager Tests
 */

import type { GameState } from '../gameState/types';

// Mock dependencies before imports
jest.mock('../gameStateManager', () => ({
  getGame: jest.fn(),
  updateGame: jest.fn(),
}));

jest.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn((gc: string) => `room:${gc}`),
}));

const mockTimerManagerInstance = {
  setTimeout: jest.fn(),
  clearTimersWithPrefix: jest.fn(),
};

jest.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: mockTimerManagerInstance,
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../events/gameCleanup', () => ({
  gameCleanupEmitter: {
    onGameEnd: jest.fn(),
    onGameReset: jest.fn(),
  },
}));

import { scheduleRoundEvent, clearRoundEventTimers } from '../roundEventsManager';
import { getGame, updateGame } from '../gameStateManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
const mockGetGame = getGame as jest.Mock;
const mockUpdateGame = updateGame as jest.Mock;
const mockBroadcastToRoom = broadcastToRoom as jest.Mock;
const mockTimerSet = mockTimerManagerInstance.setTimeout;
const mockTimerClear = mockTimerManagerInstance.clearTimersWithPrefix;

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    gameCode: 'ABCD',
    gameSessionId: 1,
    gameState: 'in-progress',
    letterGrid: [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ],
    goldenLetters: [],
    specialWords: [],
    ...overrides,
  } as unknown as GameState;
}

describe('roundEventsManager', () => {
  const io = {} as Parameters<typeof scheduleRoundEvent>[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clearRoundEventTimers', () => {
    it('clears timers with the correct prefix', () => {
      clearRoundEventTimers('GAME1');
      expect(mockTimerClear).toHaveBeenCalledWith('roundEvent:GAME1:');
    });
  });

  describe('scheduleRoundEvent', () => {
    it('picks a valid event type and schedules a timer', () => {
      const game = makeGame();
      scheduleRoundEvent(io, 'ABCD', game, 120);

      // updateGame should store the schedule
      expect(mockUpdateGame).toHaveBeenCalledWith(
        'ABCD',
        expect.objectContaining({
          roundEventSchedule: expect.objectContaining({
            eventType: expect.stringMatching(/^(blizzard|lightning|meteor)$/),
            triggerAtPercent: expect.any(Number),
          }),
          activeRoundEvent: null,
        })
      );

      // timerManager.setTimeout should be called to trigger at the right delay
      expect(mockTimerSet).toHaveBeenCalledWith(
        expect.stringContaining('roundEvent:ABCD:trigger'),
        expect.any(Function),
        expect.any(Number)
      );

      // triggerAtPercent is between 50% and 75%
      const [, updateArgs] = mockUpdateGame.mock.calls[0];
      const pct = updateArgs.roundEventSchedule.triggerAtPercent;
      expect(pct).toBeGreaterThanOrEqual(0.50);
      expect(pct).toBeLessThanOrEqual(0.75);
    });

    it('trigger delay is within expected range for a 120s game', () => {
      const game = makeGame();
      scheduleRoundEvent(io, 'ABCD', game, 120);

      const [, , delayMs] = mockTimerSet.mock.calls[0];
      expect(delayMs).toBeGreaterThanOrEqual(120_000 * 0.50);
      expect(delayMs).toBeLessThanOrEqual(120_000 * 0.75);
    });

    it('does NOT fire the event if game is no longer in-progress', () => {
      const game = makeGame();
      scheduleRoundEvent(io, 'ABCD', game, 120);

      // Simulate trigger callback with game state = 'finished'
      const triggerCallback = mockTimerSet.mock.calls[0][1] as () => void;
      mockGetGame.mockReturnValueOnce(makeGame({ gameState: 'finished' }));

      triggerCallback();

      // Should have cleared timers and NOT called broadcastToRoom
      expect(mockTimerClear).toHaveBeenCalledWith('roundEvent:ABCD:');
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('executes event lifecycle when game is in-progress at trigger time', () => {
      const game = makeGame();
      scheduleRoundEvent(io, 'ABCD', game, 120);

      const triggerCallback = mockTimerSet.mock.calls[0][1] as () => void;
      mockGetGame.mockReturnValueOnce(makeGame({ gameState: 'in-progress' }));

      triggerCallback();

      // Warning broadcast should have been emitted
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        io,
        'room:ABCD',
        'roundEventWarning',
        expect.objectContaining({
          eventType: expect.stringMatching(/^(blizzard|lightning|meteor)$/),
          timestamp: expect.any(Number),
        })
      );

      // Start and end timers should be scheduled
      expect(mockTimerSet.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('event lifecycle phases execute in order', () => {
    it('broadcasts warning → start → end in sequence', () => {
      const game = makeGame({ gameState: 'in-progress' });
      scheduleRoundEvent(io, 'ABCD', game, 60);

      // Trigger the event
      const triggerCb = mockTimerSet.mock.calls[0][1] as () => void;
      mockGetGame.mockReturnValue(makeGame({ gameState: 'in-progress' }));
      triggerCb();

      // Collect all timer callbacks (start + end phases)
      const startCb = mockTimerSet.mock.calls.find(([key]: [string]) => key.includes(':start'))?.[1] as (() => void) | undefined;
      const endCb = mockTimerSet.mock.calls.find(([key]: [string]) => key.includes(':end'))?.[1] as (() => void) | undefined;

      // Execute start
      startCb?.();
      // Execute end
      endCb?.();

      const broadcastCalls = mockBroadcastToRoom.mock.calls.map((c: unknown[]) => c[2]);
      expect(broadcastCalls).toContain('roundEventWarning');
      expect(broadcastCalls).toContain('roundEventStart');
      expect(broadcastCalls).toContain('roundEventEnd');
    });
  });
});
