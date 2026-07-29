/**
 * Round Events Manager Tests
 */

import { vi, type Mock } from 'vitest';
import type { GameState } from '../gameState/types';

// Mock dependencies before imports
vi.mock('../gameStateManager', () => ({
  getGame: vi.fn(),
  updateGame: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((gc: string) => `room:${gc}`),
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

vi.mock('../../events/gameCleanup', () => {
  const emitter = {
    onGameEnd: vi.fn(),
    onGameReset: vi.fn(),
  };
  return { gameCleanupEmitter: emitter, default: emitter };
});

import * as roundEventsManagerModule from '../roundEventsManager';
import { getGame, updateGame } from '../gameStateManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
const mockGetGame = getGame as Mock;
const mockUpdateGame = updateGame as Mock;
const mockBroadcastToRoom = broadcastToRoom as Mock;
const mockTimerSet = mockTimerManagerInstance.setTimeout;
const mockTimerClear = mockTimerManagerInstance.clearTimersWithPrefix;

// Use destructuring from the module
const { scheduleRoundEvent, clearRoundEventTimers, EVENT_CONFIG, CATALYST_POOL } = roundEventsManagerModule;

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearRoundEventTimers', () => {
    it('clears timers with the correct prefix', () => {
      clearRoundEventTimers('GAME1');
      expect(mockTimerClear).toHaveBeenCalledWith('roundEvent:GAME1:');
    });
  });

  describe('scheduleRoundEvent', () => {
    // Mock Math.random to control pickRandomCatalyst output:
    // pickRandomCatalyst = CATALYST_POOL[Math.floor(Math.random() * 4)]
    // With CATALYST_POOL = ['blizzard', 'lightning', 'meteor', 'earthquake']
    // Math.random() = 0 → CATALYST_POOL[0] = 'blizzard'
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    it('picks a valid event type and schedules a timer', () => {
      const game = makeGame();
      scheduleRoundEvent(io, 'ABCD', game, 120);

      // updateGame should store the schedule
      expect(mockUpdateGame).toHaveBeenCalledWith(
        'ABCD',
        expect.objectContaining({
          roundEventSchedule: expect.objectContaining({
            eventType: expect.stringMatching(/^(blizzard|lightning|meteor|earthquake)$/),
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
    // Mock Math.random to force 'blizzard' (index 0) for route determinism
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    it('broadcasts warning → start → end in sequence', () => {
      const game = makeGame({ gameState: 'in-progress' });
      scheduleRoundEvent(io, 'ABCD', game, 60);

      // Trigger the event
      const triggerCb = mockTimerSet.mock.calls[0][1] as () => void;
      mockGetGame.mockReturnValue(makeGame({ gameState: 'in-progress' }));
      triggerCb();

      // Collect all timer callbacks (start + end phases)
      const startCall = mockTimerSet.mock.calls.find((call: unknown[]) => {
        const key = call[0];
        return typeof key === 'string' && key.includes(':start');
      });
      const startCb = startCall?.[1] as (() => void) | undefined;

      const endCall = mockTimerSet.mock.calls.find((call: unknown[]) => {
        const key = call[0];
        return typeof key === 'string' && key.includes(':end');
      });
      const endCb = endCall?.[1] as (() => void) | undefined;

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

  describe('EVENT_CONFIG durations (catalyst unification)', () => {
    it('uses the scaled-up round-event durations', () => {
      expect(EVENT_CONFIG.blizzard).toEqual({ durationMs: 18_000, warningMs: 3_000 });
      expect(EVENT_CONFIG.lightning).toEqual({ durationMs: 15_000, warningMs: 3_000 });
      expect(EVENT_CONFIG.meteor).toEqual({ durationMs: 12_000, warningMs: 3_000 });
    });
  });

  describe('catalyst pool (catalyst unification)', () => {
    it('contains exactly the four catalysts', () => {
      expect([...CATALYST_POOL].sort()).toEqual(
        ['blizzard', 'earthquake', 'lightning', 'meteor']
      );
    });

    it('pickRandomCatalyst only ever returns a pool member', () => {
      for (let i = 0; i < 200; i++) {
        expect(CATALYST_POOL).toContain(roundEventsManagerModule.pickRandomCatalyst());
      }
    });

    it('pickRandomCatalyst can return earthquake', () => {
      // Restore the real pickRandomCatalyst for this test
      vi.restoreAllMocks();
      const seen = new Set<string>();
      for (let i = 0; i < 500; i++) seen.add(roundEventsManagerModule.pickRandomCatalyst());
      expect(seen.has('earthquake')).toBe(true);
      // Re-apply the mock for the other tests
      const spy = vi.spyOn(roundEventsManagerModule, 'pickRandomCatalyst');
      spy.mockReturnValue('blizzard');
    });
  });
});
